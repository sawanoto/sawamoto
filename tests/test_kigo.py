import copy
import json
import tempfile
import unittest
from pathlib import Path

from kigo import load_kigo

ROOT = Path(__file__).resolve().parents[1]


class KigoCalendarTests(unittest.TestCase):
    def setUp(self):
        self.data = load_kigo(ROOT / 'content/kigo.json')

    def test_leap_day_unique_words_and_all_five_seasons(self):
        self.assertEqual(len(self.data), 366)
        self.assertEqual(len({e['term'] for e in self.data.values()}), 366)
        self.assertEqual(self.data['02-29']['term'], '風光る')
        self.assertEqual({e['season'] for e in self.data.values()}, {'春', '夏', '秋', '冬', '新年'})

    def reject(self, data):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'calendar.json'
            p.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
            with self.assertRaises(ValueError):
                load_kigo(p)

    def test_missing_invalid_and_duplicate_records_are_rejected(self):
        for key in ['01-01', '02-29', '12-31']:
            data = copy.deepcopy(self.data)
            del data[key]
            self.reject(data)
        data = copy.deepcopy(self.data)
        data['02-30'] = data.pop('02-29')
        self.reject(data)
        for field, value in [('term', self.data['01-02']['term']), ('reading', '不明'),
                             ('season', '不明'), ('summary', ''), ('source', 'javascript:alert(1)')]:
            data = copy.deepcopy(self.data)
            data['01-01'][field] = value
            self.reject(data)

    def test_duplicate_json_keys_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'calendar.json'
            p.write_text('{"01-01": {}, "01-01": {}}')
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                load_kigo(p)

    def test_fixed_date_events(self):
        for date, term in {'01-01': '元日', '01-07': '七草', '01-11': '鏡開',
                           '01-15': '小正月', '02-08': '針供養', '03-03': '雛祭',
                           '04-01': '四月馬鹿', '04-08': '灌仏会', '05-05': '端午',
                           '06-30': '夏越の祓', '09-09': '重陽', '11-03': '文化の日',
                           '11-15': '七五三', '11-23': '新嘗祭', '12-24': '聖夜',
                           '12-25': 'クリスマス', '12-31': '除夜の鐘'}.items():
            self.assertEqual(self.data[date]['term'], term)


if __name__ == '__main__':
    unittest.main()
