#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DIRS = [ROOT / 'memory', ROOT / 'topics']
DEFAULT_FILES = [ROOT / 'MEMORY.md']
TEXT_EXTS = {'.md', '.txt', '.json', '.jsonl'}


def collect_files():
    files = []
    for f in DEFAULT_FILES:
        if f.exists():
            files.append(f)
    for d in DEFAULT_DIRS:
        if d.exists():
            for path in d.rglob('*'):
                if path.is_file() and path.suffix.lower() in TEXT_EXTS:
                    files.append(path)
    return sorted(set(files))


def score_line(line: str, terms):
    lower = line.lower()
    score = 0
    for term in terms:
        if term in lower:
            score += 3
    if all(term in lower for term in terms):
        score += 4
    return score


def main():
    ap = argparse.ArgumentParser(description='Search workspace memory files with line-oriented scoring.')
    ap.add_argument('query', nargs='+', help='Search terms')
    ap.add_argument('-n', '--limit', type=int, default=12, help='Max results')
    ap.add_argument('-C', '--context', type=int, default=1, help='Context lines before/after match')
    ap.add_argument('--path', action='append', default=[], help='Restrict to path containing substring (repeatable)')
    args = ap.parse_args()

    terms = [q.lower() for q in args.query]
    files = collect_files()
    if args.path:
        files = [f for f in files if all(p.lower() in str(f).lower() for p in args.path)]

    results = []
    for path in files:
        try:
            lines = path.read_text(encoding='utf-8', errors='ignore').splitlines()
        except Exception:
            continue
        for idx, line in enumerate(lines, start=1):
            score = score_line(line, terms)
            if score <= 0:
                continue
            start = max(1, idx - args.context)
            end = min(len(lines), idx + args.context)
            snippet = []
            for j in range(start, end + 1):
                prefix = '>' if j == idx else ' '
                snippet.append(f'{prefix}{j}: {lines[j-1]}')
            results.append((score, str(path.relative_to(ROOT)), idx, '\n'.join(snippet)))

    results.sort(key=lambda x: (-x[0], x[1], x[2]))
    for score, path, line_no, snippet in results[: args.limit]:
        print(f'=== score:{score} {path}:{line_no} ===')
        print(snippet)
        print()

    if not results:
        print('No matches found.')


if __name__ == '__main__':
    main()
