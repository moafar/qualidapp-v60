#!/usr/bin/env python3
"""Genera examples/sample.xlsx a partir de examples/sample.csv usando openpyxl."""
import csv
import argparse
from openpyxl import Workbook


def csv_to_xlsx(csv_path, xlsx_path):
    wb = Workbook()
    ws = wb.active
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for r, row in enumerate(reader, start=1):
            for c, val in enumerate(row, start=1):
                ws.cell(row=r, column=c, value=val)
    wb.save(xlsx_path)


def main():
    parser = argparse.ArgumentParser(description='Generar sample.xlsx desde sample.csv')
    parser.add_argument('--csv', default='examples/sample.csv')
    parser.add_argument('--out', default='examples/sample.xlsx')
    args = parser.parse_args()
    csv_to_xlsx(args.csv, args.out)
    print(f'Generado: {args.out}')


if __name__ == '__main__':
    main()
