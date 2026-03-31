import { describe, it, expect } from 'vitest';
import { runTier1, scoreTier1, classifyLine, computeBypassFlag } from './heuristics.js';

function lines(str) { return str.split('\n'); }
function score(code, lang) {
  const ls = lines(code);
  return scoreTier1(runTier1(code, ls, lang));
}

// ─────────────────────────────────────────────────────────────────────────────
// Labeled corpus — each sample has: code, language, expected label, description
// ─────────────────────────────────────────────────────────────────────────────

const AI_SAMPLES = [

  // ── Python AI samples ──────────────────────────────────────────────────────

  {
    id: 'py-ai-1',
    lang: 'Python',
    label: 'ai',
    desc: 'ChatGPT-style utility with full typing, docstrings, guard clauses',
    code: `
from typing import List, Dict, Optional, Union

import json
import os
import logging

logger = logging.getLogger(__name__)

def calculate_average_score(scores: List[float]) -> Optional[float]:
    """Calculate the average score from a list of floating-point values.

    Args:
        scores: A list of numeric scores to average.

    Returns:
        The arithmetic mean of the scores, or None if the list is empty.

    Raises:
        TypeError: If scores is not a list of numeric values.
    """
    if not isinstance(scores, list):
        raise TypeError("Invalid input: expected a list of numeric values but received a different type")
    if not scores:
        return None
    total_sum = sum(scores)
    average_value = total_sum / len(scores)
    return round(average_value, 2)

def validate_user_input(user_data: Dict[str, str]) -> Dict[str, str]:
    """Validate and sanitize user input data.

    Args:
        user_data: A dictionary containing user-submitted form data.

    Returns:
        A dictionary with validated and sanitized values.

    Raises:
        ValueError: If required fields are missing from the input data.
    """
    REQUIRED_FIELDS = ["username", "email", "password"]
    for field_name in REQUIRED_FIELDS:
        if field_name not in user_data:
            raise ValueError(f"Missing required field: {field_name} must be provided in the input data")
    sanitized_data = {}
    for field_key, field_value in user_data.items():
        sanitized_data[field_key] = field_value.strip()
    return sanitized_data

def format_response_message(status_code: int, message_body: str) -> Dict[str, Union[int, str]]:
    """Format a standardized API response message.

    Args:
        status_code: The HTTP status code for the response.
        message_body: The human-readable message to include.

    Returns:
        A dictionary containing the formatted response data.
    """
    response_data = {
        "status": status_code,
        "message": message_body,
        "timestamp": "2024-01-01T00:00:00Z",
    }
    return response_data
`.trim(),
  },

  {
    id: 'py-ai-2',
    lang: 'Python',
    label: 'ai',
    desc: 'AI data-processing module with structured docstrings & type hints',
    code: `
from typing import List, Tuple, Optional
from dataclasses import dataclass

import csv
import os

@dataclass
class DataRecord:
    """Represents a single data record from the input file."""
    identifier: str
    value: float
    category: str

def load_records_from_file(file_path: str) -> List[DataRecord]:
    """Load data records from a CSV file.

    Args:
        file_path: The path to the CSV file to read.

    Returns:
        A list of DataRecord objects parsed from the file.

    Raises:
        FileNotFoundError: If the specified file does not exist.
        ValueError: If the file contains malformed data entries.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The specified file was not found: {file_path}")
    records_list = []
    with open(file_path, "r") as input_file:
        csv_reader = csv.DictReader(input_file)
        for row_data in csv_reader:
            record_entry = DataRecord(
                identifier=row_data["id"],
                value=float(row_data["value"]),
                category=row_data["category"],
            )
            records_list.append(record_entry)
    return records_list

def filter_records_by_category(
    records: List[DataRecord],
    target_category: str,
) -> List[DataRecord]:
    """Filter records to include only those matching the target category.

    Args:
        records: The list of data records to filter.
        target_category: The category string to match against.

    Returns:
        A filtered list containing only matching records.
    """
    if not target_category:
        raise ValueError("Target category must not be an empty string value")
    filtered_results = [
        record for record in records
        if record.category == target_category
    ]
    return filtered_results

def compute_category_statistics(
    records: List[DataRecord],
) -> dict:
    """Compute aggregate statistics grouped by category.

    Args:
        records: A list of data records to analyze.

    Returns:
        A dictionary mapping category names to their statistics.
    """
    category_groups = {}
    for record_item in records:
        if record_item.category not in category_groups:
            category_groups[record_item.category] = []
        category_groups[record_item.category].append(record_item.value)
    statistics_result = {}
    for category_name, values_list in category_groups.items():
        statistics_result[category_name] = {
            "count": len(values_list),
            "average": sum(values_list) / len(values_list),
            "minimum": min(values_list),
            "maximum": max(values_list),
        }
    return statistics_result
`.trim(),
  },

  // ── JavaScript AI samples ──────────────────────────────────────────────────

  {
    id: 'js-ai-1',
    lang: 'JavaScript',
    label: 'ai',
    desc: 'AI-generated Express middleware with JSDoc, verbose naming',
    code: `
/**
 * Validates the incoming request body for required fields.
 * @param {Array<string>} requiredFields - The list of required field names.
 * @returns {Function} Express middleware function.
 * @throws {Error} If requiredFields is not a valid array.
 */
function createRequestValidator(requiredFields) {
    if (!Array.isArray(requiredFields)) {
        throw new Error("Invalid configuration: requiredFields must be a valid array of strings");
    }

    return function validateRequestBody(request, response, next) {
        const missingFieldsList = [];
        for (const fieldName of requiredFields) {
            if (!request.body || !request.body[fieldName]) {
                missingFieldsList.push(fieldName);
            }
        }
        if (missingFieldsList.length > 0) {
            const errorMessage = \`Missing required fields: \${missingFieldsList.join(", ")}\`;
            return response.status(400).json({
                success: false,
                error: errorMessage,
            });
        }
        return next();
    };
}

/**
 * Creates a rate limiting middleware for API endpoints.
 * @param {number} maxRequestsPerMinute - Maximum allowed requests per minute.
 * @param {number} windowSizeInMs - The time window in milliseconds.
 * @returns {Function} Express middleware function for rate limiting.
 */
function createRateLimiter(maxRequestsPerMinute, windowSizeInMs) {
    const requestCountMap = new Map();

    return function rateLimitMiddleware(request, response, next) {
        const clientIdentifier = request.ip || request.connection.remoteAddress;
        const currentTimestamp = Date.now();
        const windowStartTime = currentTimestamp - windowSizeInMs;

        if (!requestCountMap.has(clientIdentifier)) {
            requestCountMap.set(clientIdentifier, []);
        }

        const requestTimestamps = requestCountMap.get(clientIdentifier);
        const recentRequestTimestamps = requestTimestamps.filter(
            (timestamp) => timestamp > windowStartTime
        );

        if (recentRequestTimestamps.length >= maxRequestsPerMinute) {
            return response.status(429).json({
                success: false,
                error: "Rate limit exceeded: please try again after some time has passed",
            });
        }

        recentRequestTimestamps.push(currentTimestamp);
        requestCountMap.set(clientIdentifier, recentRequestTimestamps);
        return next();
    };
}

/**
 * Formats a database query result into a standardized response object.
 * @param {Array<Object>} queryResults - The raw database query results.
 * @param {Object} paginationOptions - Pagination configuration options.
 * @returns {Object} The formatted response with pagination metadata.
 */
function formatQueryResponse(queryResults, paginationOptions) {
    const formattedResponse = {
        data: queryResults,
        pagination: {
            currentPage: paginationOptions.page || 1,
            itemsPerPage: paginationOptions.limit || 10,
            totalItems: queryResults.length,
        },
    };
    return formattedResponse;
}
`.trim(),
  },

  {
    id: 'js-ai-2',
    lang: 'JavaScript',
    label: 'ai',
    desc: 'AI utility library with uniform structure and verbose docs',
    code: `
/**
 * Deeply clones an object, handling nested objects and arrays.
 * @param {Object} sourceObject - The object to clone.
 * @returns {Object} A deep copy of the source object.
 * @throws {Error} If the input is not a valid object.
 */
function deepCloneObject(sourceObject) {
    if (sourceObject === null || typeof sourceObject !== "object") {
        throw new Error("Invalid input: expected a non-null object for deep cloning operation");
    }
    return JSON.parse(JSON.stringify(sourceObject));
}

/**
 * Debounces a function call to prevent excessive invocations.
 * @param {Function} callbackFunction - The function to debounce.
 * @param {number} delayInMilliseconds - The debounce delay in milliseconds.
 * @returns {Function} The debounced version of the callback function.
 */
function createDebouncedFunction(callbackFunction, delayInMilliseconds) {
    let timeoutIdentifier = null;
    return function debouncedWrapper(...argumentsList) {
        if (timeoutIdentifier !== null) {
            clearTimeout(timeoutIdentifier);
        }
        timeoutIdentifier = setTimeout(() => {
            callbackFunction.apply(this, argumentsList);
            timeoutIdentifier = null;
        }, delayInMilliseconds);
    };
}

/**
 * Flattens a nested array structure into a single-level array.
 * @param {Array} nestedArray - The nested array to flatten.
 * @param {number} depthLevel - The maximum depth to flatten.
 * @returns {Array} The flattened array result.
 */
function flattenNestedArray(nestedArray, depthLevel = Infinity) {
    if (!Array.isArray(nestedArray)) {
        throw new Error("Invalid input: expected an array for the flattening operation");
    }
    const flattenedResult = [];
    for (const currentElement of nestedArray) {
        if (Array.isArray(currentElement) && depthLevel > 0) {
            const recursiveResult = flattenNestedArray(currentElement, depthLevel - 1);
            flattenedResult.push(...recursiveResult);
        } else {
            flattenedResult.push(currentElement);
        }
    }
    return flattenedResult;
}
`.trim(),
  },

  // ── Java AI sample ─────────────────────────────────────────────────────────

  {
    id: 'java-ai-1',
    lang: 'Java',
    label: 'ai',
    desc: 'AI-generated Java service with Javadoc and structured error handling',
    code: `
import java.util.List;
import java.util.Map;
import java.util.Optional;

import java.util.stream.Collectors;

/**
 * Service class for managing user account operations.
 *
 * @author AI Assistant
 * @since 1.0.0
 */
public class UserAccountService {

    /**
     * Retrieves a user account by their unique identifier.
     *
     * @param userId The unique identifier of the user account.
     * @return An Optional containing the user if found, empty otherwise.
     * @throws IllegalArgumentException If the userId is null or empty.
     */
    public Optional findUserById(String userId) {
        if (userId == null || userId.isEmpty()) {
            throw new IllegalArgumentException("User ID must not be null or empty for account lookup");
        }
        return Optional.empty();
    }

    /**
     * Validates the provided user credentials against stored records.
     *
     * @param username The username to validate.
     * @param password The password to verify.
     * @return True if the credentials are valid, false otherwise.
     * @throws IllegalArgumentException If credentials are missing.
     */
    public boolean validateCredentials(String username, String password) {
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username must be provided for credential validation");
        }
        if (password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password must be provided for credential validation");
        }
        return false;
    }

    /**
     * Retrieves all active user accounts from the data store.
     *
     * @return A list of active user account objects.
     */
    public List getAllActiveUsers() {
        return List.of();
    }
}
`.trim(),
  },

];

const HUMAN_SAMPLES = [

  // ── Python human samples ───────────────────────────────────────────────────

  {
    id: 'py-human-1',
    lang: 'Python',
    label: 'human',
    desc: 'Quick-and-dirty script with TODOs, terse names, no docstrings',
    code: `
import os
import json
from pathlib import Path

def readcfg(p):
    # todo: validate schema
    with open(p) as f:
        d = json.load(f)
    return d

def merge(a, b):
    out = dict(a)
    for k, v in b.items():
        if k in out and isinstance(out[k], dict):
            out[k] = merge(out[k], v)  # FIXME: deep merge is sketchy
        else:
            out[k] = v
    return out

def run(args):
    cfg = readcfg(args.config)
    if args.override:
        ov = json.loads(args.override)
        cfg = merge(cfg, ov)
    
    # hack: force debug if env says so
    if os.environ.get('DEBUG'):
        cfg['debug'] = True
    
    outdir = Path(cfg.get('output', './out'))
    outdir.mkdir(exist_ok=True)
    
    for i, item in enumerate(cfg.get('tasks', [])):
        # XXX this is slow for big lists
        res = process(item)
        fp = outdir / f'{i}.json'
        with open(fp, 'w') as f:
            json.dump(res, f)
    
    print(f"done, wrote {i+1} files")  # quick debug
`.trim(),
  },

  {
    id: 'py-human-2',
    lang: 'Python',
    label: 'human',
    desc: 'Real-world scrappy parser with abbreviations and debug prints',
    code: `
import re
import sys

# quick tokenizer, prob has bugs
def tok(src):
    toks = []
    i = 0
    while i < len(src):
        c = src[i]
        if c in ' \\t\\n':
            i += 1
            continue
        if c == '#':
            while i < len(src) and src[i] != '\\n':
                i += 1
            continue
        if c in '(){}[];,.:':
            toks.append(c)
            i += 1
            continue
        # strings
        if c in '"\\'' :
            j = i + 1
            while j < len(src) and src[j] != c:
                if src[j] == '\\\\': j += 1  # skip escaped
                j += 1
            toks.append(src[i:j+1])
            i = j + 1
            continue
        # idents/nums
        j = i
        while j < len(src) and src[j] not in ' \\t\\n(){}[];,.:"\\'#':
            j += 1
        toks.append(src[i:j])
        i = j
    return toks

def parse(toks):
    # TODO: proper recursive descent
    ast = []
    pos = 0
    while pos < len(toks):
        t = toks[pos]
        if t == '(':
            depth = 1
            start = pos
            pos += 1
            while pos < len(toks) and depth > 0:
                if toks[pos] == '(': depth += 1
                if toks[pos] == ')': depth -= 1
                pos += 1
            ast.append(('expr', toks[start:pos]))
        else:
            ast.append(('atom', t))
            pos += 1
    return ast

if __name__ == '__main__':
    src = open(sys.argv[1]).read()
    ts = tok(src)
    print(parse(ts))  # temp
`.trim(),
  },

  {
    id: 'py-human-3',
    lang: 'Python',
    label: 'human',
    desc: 'Messy data analysis with mixed style, magic numbers, reused variables',
    code: `
import csv

def load(path):
    rows = []
    with open(path) as f:
        r = csv.reader(f)
        hdr = next(r)
        for row in r:
            rows.append(dict(zip(hdr, row)))
    return rows

def crunch(rows):
    # todo: this is N^2, fix later
    buckets = {}
    for r in rows:
        k = r.get('type', 'other')
        if k not in buckets:
            buckets[k] = []
        buckets[k].append(float(r['val']))

    out = {}
    for k, vs in buckets.items():
        vs.sort()
        n = len(vs)
        avg = sum(vs) / n
        # median calc - quick & dirty
        if n % 2:
            med = vs[n // 2]
        else:
            med = (vs[n//2 - 1] + vs[n//2]) / 2
        p95 = vs[int(n * 0.95)] if n > 20 else vs[-1]
        out[k] = {'avg': avg, 'med': med, 'p95': p95, 'n': n}
    return out

def report(stats):
    for k, v in sorted(stats.items()):
        print(f"{k}: avg={v['avg']:.1f} med={v['med']:.1f} p95={v['p95']:.1f} n={v['n']}")

if __name__ == '__main__':
    import sys
    rows = load(sys.argv[1])
    s = crunch(rows)
    report(s)
`.trim(),
  },

  // ── JavaScript human samples ───────────────────────────────────────────────

  {
    id: 'js-human-1',
    lang: 'JavaScript',
    label: 'human',
    desc: 'Quick Node.js script with terse naming, TODOs, var usage',
    code: `
var fs = require('fs')
var path = require('path')

// todo: add proper arg parsing
var dir = process.argv[2] || '.'
var ext = process.argv[3] || '.js'

function walk(d) {
    var out = []
    var ls = fs.readdirSync(d)
    for (var i = 0; i < ls.length; i++) {
        var fp = path.join(d, ls[i])
        var st = fs.statSync(fp)
        if (st.isDirectory()) {
            // skip node_modules etc
            if (ls[i][0] === '.' || ls[i] === 'node_modules') continue
            out = out.concat(walk(fp))
        } else if (path.extname(fp) === ext) {
            out.push(fp)
        }
    }
    return out
}

function countLines(fp) {
    var buf = fs.readFileSync(fp, 'utf8')
    var n = buf.split('\\n').length
    return n
}

// FIXME: should probably stream large files
var files = walk(dir)
var total = 0
for (var i = 0; i < files.length; i++) {
    var n = countLines(files[i])
    total += n
    console.log(files[i] + ': ' + n)  // quick debug
}
console.log('total: ' + total + ' lines in ' + files.length + ' files')
`.trim(),
  },

  {
    id: 'js-human-2',
    lang: 'JavaScript',
    label: 'human',
    desc: 'Scrappy DOM manipulation with abbreviations and hacks',
    code: `
// quick form validator - needs cleanup
function initForm(sel) {
    var el = document.querySelector(sel)
    if (!el) return  // bail

    var inputs = el.querySelectorAll('input[required]')
    var btn = el.querySelector('[type=submit]')
    
    // hack: disable btn initially
    btn.disabled = true

    function chk() {
        var ok = true
        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i]
            var val = inp.value.trim()
            
            if (!val) { ok = false; mark(inp, 'err'); continue }
            
            // email check - prob not robust enough
            if (inp.type === 'email' && val.indexOf('@') < 0) {
                ok = false
                mark(inp, 'err')
                continue
            }
            
            // wtf: min length hardcoded
            if (inp.name === 'password' && val.length < 8) {
                ok = false
                mark(inp, 'err')
                continue
            }
            
            mark(inp, 'ok')
        }
        btn.disabled = !ok
    }

    function mark(el, cls) {
        el.className = el.className.replace(/\\b(err|ok)\\b/g, '').trim()
        el.className += ' ' + cls
    }

    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', chk)
    }
    
    // idk why but need initial check too
    chk()
}

initForm('#signup')
`.trim(),
  },

  // ── Java human sample ─────────────────────────────────────────────────────

  {
    id: 'java-human-1',
    lang: 'Java',
    label: 'human',
    desc: 'Quick Java util with no Javadoc, short names, commented-out code',
    code: `
import java.util.ArrayList;
import java.util.HashMap;

public class DataUtils {
    
    // parse csv-ish data, not robust
    public static ArrayList<String[]> parseCsv(String raw) {
        var out = new ArrayList<String[]>();
        var lines = raw.split("\\n");
        for (var ln : lines) {
            if (ln.trim().isEmpty()) continue;
            // String[] parts = ln.split(",", -1);  // old impl
            var parts = ln.split(",");
            out.add(parts);
        }
        return out;
    }

    // todo: handle nulls better
    public static HashMap<String, Integer> freq(String[] items) {
        var m = new HashMap<String, Integer>();
        for (var s : items) {
            var k = s.trim().toLowerCase();
            m.put(k, m.getOrDefault(k, 0) + 1);
        }
        return m;
    }

    // FIXME: n^2, use a real algo
    public static String[] dedup(String[] arr) {
        var seen = new HashMap<String, Boolean>();
        var tmp = new ArrayList<String>();
        for (var s : arr) {
            if (!seen.containsKey(s)) {
                seen.put(s, true);
                tmp.add(s);
            }
        }
        return tmp.toArray(new String[0]);
    }

    public static void main(String[] args) {
        var data = "a,b,c\\n1,2,3\\n4,5,6";
        var rows = parseCsv(data);
        System.out.println(rows.size());  // debug
    }
}
`.trim(),
  },

];

// ─────────────────────────────────────────────────────────────────────────────
// ACCURACY BENCHMARK
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD = 50;

describe('ACCURACY BENCHMARK: Tier 1 AI vs Human classification (new weights + bypass flag)', () => {

  const results = [];
  const bypassResults = [];

  const allSamples = [...AI_SAMPLES, ...HUMAN_SAMPLES];
  for (const sample of allSamples) {
    const s = score(sample.code, sample.lang);
    const bypass = computeBypassFlag(sample.code, lines(sample.code), sample.lang);
    const predicted = (s > THRESHOLD || bypass.triggered) ? 'ai' : 'human';
    const correct = predicted === sample.label;
    results.push({ ...sample, score: s, bypass, predicted, correct });
    bypassResults.push({ id: sample.id, label: sample.label, bypass });
  }

  // ── Per-sample: score-based classification ─────────────────────────────────

  describe('AI samples: score-based detection', () => {
    for (const sample of AI_SAMPLES) {
      it(`[${sample.id}] ${sample.desc} (${sample.lang}) — score or bypass catches it`, () => {
        const s = score(sample.code, sample.lang);
        const bypass = computeBypassFlag(sample.code, lines(sample.code), sample.lang);
        const humanBaseline = results
          .filter(r => r.label === 'human' && r.lang === sample.lang)
          .map(r => r.score);
        const maxHuman = humanBaseline.length ? Math.max(...humanBaseline) : 35;
        expect(s > THRESHOLD || bypass.triggered || s > maxHuman).toBe(true);
      });
    }
  });

  describe('Human samples should NOT trigger bypass and score near/below threshold', () => {
    for (const sample of HUMAN_SAMPLES) {
      it(`[${sample.id}] ${sample.desc} (${sample.lang})`, () => {
        const s = score(sample.code, sample.lang);
        const bypass = computeBypassFlag(sample.code, lines(sample.code), sample.lang);
        expect(bypass.triggered).toBe(false);
        expect(s).toBeLessThanOrEqual(THRESHOLD);
      });
    }
  });

  // ── Bypass flag tests ──────────────────────────────────────────────────────

  describe('bypass flag triggers correctly', () => {
    it('Python AI samples with type annotations / docstrings trigger bypass', () => {
      for (const sample of AI_SAMPLES.filter(s => s.lang === 'Python')) {
        const bypass = computeBypassFlag(sample.code, lines(sample.code), sample.lang);
        expect(bypass.triggered).toBe(true);
        expect(bypass.bypass_confidence).toBe(0.92);
        expect(bypass.reasons.length).toBeGreaterThan(0);
      }
    });

    it('human samples never trigger bypass', () => {
      for (const sample of HUMAN_SAMPLES) {
        const bypass = computeBypassFlag(sample.code, lines(sample.code), sample.lang);
        expect(bypass.triggered).toBe(false);
      }
    });

    it('bypass flag is independent of weighted score', () => {
      for (const r of results) {
        if (r.bypass.triggered) {
          expect(r.bypass.bypass_confidence).toBe(0.92);
          expect(r.bypass.message).toBe('Structural AI markers detected — immediate review recommended');
        }
      }
    });
  });

  // ── Aggregate accuracy report ──────────────────────────────────────────────

  describe('aggregate accuracy metrics', () => {
    it('prints full accuracy report with score + bypass flag', () => {
      const correctScore = results.filter(r => (r.score > THRESHOLD) === (r.label === 'ai')).length;
      const correctCombined = results.filter(r => r.correct).length;
      const scoreAcc = (correctScore / results.length) * 100;
      const combinedAcc = (correctCombined / results.length) * 100;

      console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
      console.log('║       TIER 1 ACCURACY BENCHMARK — NEW WEIGHTS + BYPASS FLAG          ║');
      console.log('╠════════════════════════════════════════════════════════════════════════╣');
      console.log(`║  Total samples:       ${results.length.toString().padStart(3)}                                              ║`);
      console.log(`║  Score-only accuracy: ${scoreAcc.toFixed(1).padStart(5)}%                                            ║`);
      console.log(`║  Score+Bypass:        ${combinedAcc.toFixed(1).padStart(5)}%                                            ║`);
      console.log('╠════════════════════════════════════════════════════════════════════════╣');
      console.log('║  SAMPLE RESULTS                                                      ║');
      console.log('╠════════════════════════════════════════════════════════════════════════╣');
      for (const r of results) {
        const icon = r.correct ? '✓' : '✗';
        const bp = r.bypass.triggered ? 'BYPASS' : '      ';
        const line = `║  ${icon} ${r.id.padEnd(14)} ${r.lang.padEnd(12)} ` +
          `score=${r.score.toString().padStart(3)} ${bp} ` +
          `expect=${r.label.padEnd(6)} got=${r.predicted.padEnd(6)} ║`;
        console.log(line);
      }
      console.log('╠════════════════════════════════════════════════════════════════════════╣');
      console.log('║  WEIGHT CHANGES: 11 active signals (DSA-tuned)                       ║');
      console.log('║  BYPASS: type_annotations, docstrings, emoji → 0.92 confidence flag  ║');
      console.log('║  REMOVED from score: blank_density, indent_consistency, comment_      ║');
      console.log('║    absence, halstead, string_formatting, error_verbosity              ║');
      console.log('╚════════════════════════════════════════════════════════════════════════╝');

      expect(combinedAcc).toBeGreaterThanOrEqual(80);
    });

    it('no human sample triggers bypass; scores within tolerance', () => {
      for (const r of results.filter(r => r.label === 'human')) {
        expect(r.bypass.triggered).toBe(false);
        expect(r.score).toBeLessThanOrEqual(50);
      }
    });

    it('AI average score > Human average score', () => {
      const aiScores = results.filter(r => r.label === 'ai').map(r => r.score);
      const humanScores = results.filter(r => r.label === 'human').map(r => r.score);
      const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
      const humanAvg = humanScores.reduce((a, b) => a + b, 0) / humanScores.length;
      const separation = aiAvg - humanAvg;
      console.log(`\n  AI avg score:    ${aiAvg.toFixed(1)}`);
      console.log(`  Human avg score: ${humanAvg.toFixed(1)}`);
      console.log(`  Separation:      ${separation.toFixed(1)} points\n`);
      expect(aiAvg).toBeGreaterThan(humanAvg);
      expect(separation).toBeGreaterThan(5);
    });

    it('every AI sample scores higher than every human sample of the same language', () => {
      const languages = [...new Set(allSamples.map(s => s.lang))];
      for (const lang of languages) {
        const aiScores = results.filter(r => r.label === 'ai' && r.lang === lang).map(r => r.score);
        const humanScores = results.filter(r => r.label === 'human' && r.lang === lang).map(r => r.score);
        if (!aiScores.length || !humanScores.length) continue;
        const aiMin = Math.min(...aiScores);
        const humanMax = Math.max(...humanScores);
        console.log(`  ${lang}: AI min=${aiMin}, Human max=${humanMax}, gap=${aiMin - humanMax}`);
        expect(aiMin).toBeGreaterThan(humanMax);
      }
    });
  });

  // ── Per-language accuracy ──────────────────────────────────────────────────

  describe('per-language accuracy (score + bypass combined)', () => {
    it('Python: 100% combined accuracy', () => {
      const pyResults = results.filter(r => r.lang === 'Python');
      const correct = pyResults.filter(r => r.correct).length;
      expect(correct).toBe(pyResults.length);
    });

    it('All languages: AI always above same-language Human on score', () => {
      const langs = [...new Set(allSamples.map(s => s.lang))];
      for (const lang of langs) {
        const aiMin = Math.min(...results.filter(r => r.label === 'ai' && r.lang === lang).map(r => r.score));
        const humanMax = Math.max(...results.filter(r => r.label === 'human' && r.lang === lang).map(r => r.score));
        if (isFinite(aiMin) && isFinite(humanMax)) {
          expect(aiMin).toBeGreaterThan(humanMax);
        }
      }
    });
  });

  // ── Per-signal diagnostics ─────────────────────────────────────────────────

  describe('per-signal diagnostics (new weights)', () => {
    it('JS AI: naming_verbosity still detects verbose names (highest-weight signal)', () => {
      const jsAi = AI_SAMPLES.find(s => s.id === 'js-ai-1');
      const metrics = runTier1(jsAi.code, lines(jsAi.code), jsAi.lang);
      expect(metrics.naming_verbosity).toBeGreaterThan(40);
    });

    it('type_annotations, docstring_coverage, emoji are still computed but not in score', () => {
      const pyAi = AI_SAMPLES.find(s => s.id === 'py-ai-1');
      const metrics = runTier1(pyAi.code, lines(pyAi.code), pyAi.lang);
      expect(metrics.type_annotations).toBeGreaterThan(0);
      expect(metrics.docstring_coverage).toBeGreaterThan(0);
      expect(typeof metrics.emoji_presence).toBe('number');
    });
  });

  // ── Line-level accuracy ────────────────────────────────────────────────────

  describe('classifyLine accuracy on signature lines', () => {
    const aiLines = [
      { line: '    """', lang: 'Python', expect: 'ai', desc: 'docstring delimiter' },
      { line: '# Step 1: Initialize the database connection', lang: 'Python', expect: 'ai', desc: 'numbered step' },
      { line: ' * @param userId The unique identifier of the user account.', lang: 'JavaScript', expect: 'ai', desc: '@param tag' },
      { line: '# This function validates the incoming request parameters', lang: 'Python', expect: 'ai', desc: 'formal comment' },
      { line: 'raise ValueError("Invalid input: expected a positive integer but received negative")', lang: 'Python', expect: 'ai', desc: 'verbose error' },
    ];

    const uncertainLines = [
      { line: '    """Calculate the maximum value from the input data.', lang: 'Python', expect: 'ai', desc: 'docstring content line (has doc-comment delimiter)' },
    ];

    const humanLines = [
      { line: '# todo: fix this hack', lang: 'Python', expect: 'human', desc: 'TODO marker' },
      { line: '# FIXME: not robust enough', lang: 'Python', expect: 'human', desc: 'FIXME marker' },
      { line: '// wtf is this doing', lang: 'JavaScript', expect: 'human', desc: 'casual expletive' },
      { line: 'raise ValueError("bad")', lang: 'Python', expect: 'human', desc: 'terse error' },
      { line: '# quick fix', lang: 'Python', expect: 'human', desc: 'lowercase terse' },
    ];

    for (const tc of aiLines) {
      it(`AI line [${tc.desc}]: "${tc.line.trim().slice(0, 45)}..."`, () => {
        const result = classifyLine(tc.line, [tc.line], 0, tc.lang);
        expect(result.status).toBe(tc.expect);
      });
    }

    for (const tc of uncertainLines) {
      it(`Uncertain line [${tc.desc}]: "${tc.line.trim().slice(0, 45)}..."`, () => {
        const result = classifyLine(tc.line, [tc.line], 0, tc.lang);
        expect(result.status).toBe(tc.expect);
      });
    }

    for (const tc of humanLines) {
      it(`Human line [${tc.desc}]: "${tc.line.trim().slice(0, 45)}..."`, () => {
        const result = classifyLine(tc.line, [tc.line], 0, tc.lang);
        expect(result.status).toBe(tc.expect);
      });
    }
  });
});
