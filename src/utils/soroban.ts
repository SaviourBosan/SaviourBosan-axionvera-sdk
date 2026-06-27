import { xdr } from "@stellar/stellar-sdk";
import { decodeXdrBase64 } from "./xdrCache";
import { assertValidXDR } from './xdrValidator';

/**
 * Decoded Soroban event topic representation.
 * Can be a symbol, string, or other decoded value.
 */
export type DecodedTopic = 
  | string 
  | number 
  | bigint 
  | boolean 
  | null 
  | DecodedTopic[];

/** Type guard for XDR ScVal arm type */
function isScValArm(value: any, arm: string): value is { arm: () => string; value: () => any } {
  return value != null && typeof value.arm === 'function' && typeof value.value === 'function';
}

/**
 * Parsed Soroban event with structured topics and data.
 */
export type ParsedEvent = {
  /** Event topics (usually function name and indexed parameters) */
  topics: DecodedTopic[];
  /** Event data payload */
  data?: DecodedTopic;
  /** Decoded primary topic (event name) - convenience property */
  eventName?: string;
  /** Raw event data from RPC for reference */
  raw?: any;
  /** Whether this is a diagnostic event */
  isDiagnostic?: boolean;
};

/**
 * Options for parsing Soroban events.
 */
export type ParseEventsOptions = {
  /** If true, filter out diagnostic events from results */
  filterDiagnostic?: boolean;
  /** If true, include raw RPC event data in results */
  includeRaw?: boolean;
};

/**
 * Decodes a Soroban Symbol ScVal into a JavaScript UTF-8 string.
 * Soroban Symbols are used for function names, event topics, and short strings.
 * They are limited to 32 characters and a specific charset [a-zA-Z0-9_].
 * 
 * @param scVal - The ScVal to decode, should be of type scvSymbol
 * @returns The decoded string
 */
export function decodeSorobanSymbol(scVal: xdr.ScVal): string {
  // Use safe property access with type narrowing
  const arm = (scVal as any)?.arm?.();
  
  if (arm === 'sym' || arm === 'str') {
    const value = (scVal as any)?.value?.();
    return value ? value.toString() : "";
  }

  return "";
}

/**
 * Safely decodes an ScVal to a JavaScript value.
 * Supports symbols, strings, integers, and other basic types.
 * Falls back to string representation if type is not directly convertible.
 * 
 * @param scVal - The XDR ScVal to decode
 * @returns Decoded value as a JavaScript type
 */
function decodeScVal(scVal: xdr.ScVal): DecodedTopic {
  try {
    if (!scVal) return null;

    const scValObj = scVal as any;
    const arm = scValObj?.arm?.();

    if (!arm) return null;

    // Handle symbols and strings
    if (arm === 'sym' || arm === 'str') {
      return decodeSorobanSymbol(scVal);
    }

    // Handle integers
    if (arm === 'i128' || arm === 'i256') {
      const intVal = scValObj?.value?.();
      if (intVal) {
        if (typeof intVal.toNumber === 'function') {
          return intVal.toNumber();
        }
        if (typeof intVal.toString === 'function') {
          return BigInt(intVal.toString());
        }
      }
      return null;
    }

    // Handle unsigned integers
    if (arm === 'u128' || arm === 'u256') {
      const uintVal = scValObj?.value?.();
      if (uintVal) {
        if (typeof uintVal.toNumber === 'function') {
          return uintVal.toNumber();
        }
        if (typeof uintVal.toString === 'function') {
          return BigInt(uintVal.toString());
        }
      }
      return null;
    }

    // Handle booleans
    if (arm === 'b') {
      const boolVal = scValObj?.b?.();
      return typeof boolVal === 'boolean' ? boolVal : null;
    }

    // Handle void
    if (arm === 'void') {
      return null;
    }

    // For unknown types, return string representation
    const stringVal = scValObj?.toString?.();
    return typeof stringVal === 'string' ? stringVal : null;
  } catch (error) {
    // If decoding fails, return null
    return null;
  }
}

/**
 * Type guard to check if event has diagnostic marker.
 */
function isDiagnosticEvent(event: unknown): event is Record<string, unknown> & { type?: string } {
  if (!event || typeof event !== 'object') return false;
  const eventObj = event as Record<string, unknown>;
  
  // Check if the event has 'type' field and it's 'diagnostic'
  if (eventObj.type === 'diagnostic') {
    return true;
  }

  // Alternative: check if topics contain 'diagnostic' marker
  const topic = eventObj.topic;
  if (Array.isArray(topic) && topic.length > 0) {
    try {
      const firstTopic = topic[0];
      if (typeof firstTopic === 'string') {
        const decoded = decodeXdrBase64(firstTopic);
        const topicStr = decodeSorobanSymbol(decoded);
        if (topicStr === 'diagnostic' || topicStr.startsWith('_')) {
          return true;
        }
      }
    } catch {
      // If we can't decode, assume it's not diagnostic
    }
  }

  return false;
}

/**
 * Generic utility to parse Soroban events from RPC responses.
 * Converts XDR-encoded topics and data payloads into a readable JSON structure.
 * 
 * Perfect for developers building custom contracts using BaseContract who need to
 * parse raw XDR events without writing custom base64 decoders.
 * 
 * @param events - Raw events array from Soroban RPC (GetEventsResponse)
 * @param options - Parsing options (filterDiagnostic, includeRaw)
 * @returns Array of parsed events with decoded topics and data
 * 
 * @example
 * ```typescript
 * // Get events from RPC
 * const events = await client.rpc.getEvents({ startLedger: 1000 });
 * 
 * // Parse events with diagnostic filtering
 * const parsed = parseEvents(events, { filterDiagnostic: true });
 * 
 * parsed.forEach(event => {
 *   console.log(`Event: ${event.eventName}`);
 *   console.log(`Topics:`, event.topics);
 *   console.log(`Data:`, event.data);
 * });
 * ```
 */
export function parseEvents(
  events: any[] | undefined,
  options?: ParseEventsOptions
): ParsedEvent[] {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  return events
    .map((event) => {
      try {
        const isDiag = isDiagnosticEvent(event);
        
        // Skip diagnostic events if filtering is enabled
        if (options?.filterDiagnostic && isDiag) {
          return null;
        }

        const parsedEvent: ParsedEvent = {
          topics: [],
          isDiagnostic: isDiag
        };

        // Decode topics
        if (Array.isArray(event.topic) && event.topic.length > 0) {
          parsedEvent.topics = event.topic.map((t: string) => {
            try {
              const scVal = decodeXdrBase64(t);
              return decodeScVal(scVal);
            } catch {
              // If decoding fails, return the raw string
              return t;
            }
          });

          // Set convenience property for event name (first topic)
          if (parsedEvent.topics.length > 0 && typeof parsedEvent.topics[0] === 'string') {
            parsedEvent.eventName = parsedEvent.topics[0];
          }
        }

        // Decode data payload
        if (event.data) {
          try {
            const dataScVal = decodeXdrBase64(event.data);
            parsedEvent.data = decodeScVal(dataScVal);
          } catch {
            // If decoding fails, keep raw data
            parsedEvent.data = event.data;
          }
        }

        // Include raw event if requested
        if (options?.includeRaw) {
          parsedEvent.raw = event;
        }

        return parsedEvent;
      } catch (error) {
        // Log parsing errors but don't fail entirely
        console.warn('Error parsing event:', error, event);
        return null;
      }
    })
    .filter((event) => event !== null) as ParsedEvent[];
}

/**
 * Legacy version of parseEvents that maintains backward compatibility.
 * @deprecated Use parseEvents({ filterDiagnostic: true }) instead
 * Converts XDR-encoded topics and values into more accessible formats where possible.
 *
 * Consumer-supplied topic strings are sanitized with {@link assertValidXDR} before
 * being decoded.  Any topic that fails the check is kept as-is and the error is
 * surfaced rather than silently swallowed.
 *
 * @param events - Raw events from Soroban RPC (GetEventsResponse)
 * @returns Parsed events with decoded symbols
 */
export function parseEventsLegacy(events: any[]): any[] {
  return events.map(event => {
    const parsedEvent = { ...event };

    if (Array.isArray(event.topic)) {
      parsedEvent.topicNames = event.topic.map((t: string) => {
        try {
          // Sanitize before any buffer allocation.
          assertValidXDR(t, 'parseEvents');
          const scVal = decodeXdrBase64(t);
          const s = scVal as any;
          if (s.arm() === 'sym') {
            return decodeSorobanSymbol(scVal);
          }
          return t;
        } catch {
          return t;
        }
      });
    }

    if (parsedEvent.topicNames && parsedEvent.topicNames.length > 0) {
      parsedEvent.eventName = parsedEvent.topicNames[0];
    }

    return parsedEvent;
  });
}
