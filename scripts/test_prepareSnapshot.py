import io
import os
import sys
import tempfile

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scripts.prepareSnapshot import replaceFunc, prepare_snapshot


class TestReplaceFunc:
    def test_single_null(self):
        assert replaceFunc("[null]") == "[]"

    def test_double_null(self):
        assert replaceFunc("[null,null]") == "[]"

    def test_null_prefix(self):
        assert replaceFunc("[null,0xabc]") == "[0xabc]"

    def test_null_suffix(self):
        assert replaceFunc("[0xabc,null]") == "[0xabc]"

    def test_no_null(self):
        assert replaceFunc("[0xabc,0xdef]") == "[0xabc,0xdef]"

    def test_empty_string(self):
        assert replaceFunc("[]") == "[]"


def _make_csv(rows):
    """Helper to write rows dict to a temporary CSV file and return the path."""
    df = pd.DataFrame(rows)
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False
    )
    df.to_csv(tmp.name, index=False)
    tmp.close()
    return tmp.name


class TestPrepareSnapshot:
    def setup_method(self):
        self.original_dir = os.getcwd()
        self.tmp_dir = tempfile.mkdtemp()
        os.chdir(self.tmp_dir)

    def teardown_method(self):
        os.chdir(self.original_dir)
        for fname in [
            "yield_snapshot_hourly.csv",
            "yield_snapshot_daily.json",
            "yield_snapshot_last.json",
        ]:
            path = os.path.join(self.tmp_dir, fname)
            if os.path.exists(path):
                os.remove(path)
        os.rmdir(self.tmp_dir)

    def _base_row(self, **kwargs):
        row = {
            "pool": "pool-a",
            "project": "test-project",
            "timestamp": "2023-01-01 00:00:00",
            "apy": 5.0,
            "apyBase": 3.0,
            "apyReward": 2.0,
            "tvlUsd": 50000.0,
            "underlyingTokens": float("nan"),
            "rewardTokens": float("nan"),
        }
        row.update(kwargs)
        return row

    def test_filters_negative_apy(self):
        rows = [self._base_row(apy=-1.0), self._base_row(apy=5.0)]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["apy"] == 5.0

    def test_filters_low_tvl(self):
        rows = [self._base_row(tvlUsd=500.0), self._base_row(tvlUsd=50000.0)]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["tvlUsd"] == 50000

    def test_filters_excluded_pool(self):
        excluded = "0xf4bfe9b4ef01f27920e490cea87fe2642a8da18d"
        rows = [
            self._base_row(pool=excluded),
            self._base_row(pool="pool-ok"),
        ]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["pool"] == "pool-ok"

    def test_filters_excluded_project(self):
        rows = [
            self._base_row(project="koyo-finance"),
            self._base_row(project="test-project"),
        ]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["project"] == "test-project"

    def test_tvl_cast_to_int(self):
        rows = [self._base_row(tvlUsd=12345.99)]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert result.iloc[0]["tvlUsd"] == 12345

    def test_apy_rounded_to_5_decimals(self):
        rows = [self._base_row(apy=1.123456789)]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert result.iloc[0]["apy"] == pytest.approx(1.12346, abs=1e-5)

    def test_removes_all_null_apy_rows(self):
        rows = [
            self._base_row(apy=float("nan"), apyBase=float("nan"), apyReward=float("nan")),
            self._base_row(apy=5.0),
        ]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert len(result) == 1

    def test_output_files_created(self):
        rows = [self._base_row()]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        assert os.path.exists("yield_snapshot_hourly.csv")
        assert os.path.exists("yield_snapshot_daily.json")
        assert os.path.exists("yield_snapshot_last.json")

    def test_corrects_null_in_underlying_tokens(self):
        rows = [self._base_row(underlyingTokens="[null,0xabc]")]
        csv_path = _make_csv(rows)
        prepare_snapshot(csv_path)
        result = pd.read_csv("yield_snapshot_hourly.csv")
        assert result.iloc[0]["underlyingTokens"] == "[0xabc]"
