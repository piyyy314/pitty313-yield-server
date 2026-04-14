import io
import pandas as pd
import pytest

from scripts.prepareSnapshot import replaceFunc, prepare_snapshot


class TestReplaceFunc:
    def test_null_single(self):
        assert replaceFunc("[null]") == "[]"

    def test_null_double(self):
        assert replaceFunc("[null,null]") == "[]"

    def test_null_prefix(self):
        assert replaceFunc("[null,0x123]") == "[0x123]"

    def test_null_suffix(self):
        assert replaceFunc("[0x123,null]") == "[0x123]"

    def test_no_null(self):
        assert replaceFunc("[0xabc,0xdef]") == "[0xabc,0xdef]"

    def test_empty_string(self):
        assert replaceFunc("") == ""


class TestPrepareSnapshot:
    def _base_row(self, **kwargs):
        row = {
            "pool": "pool-1",
            "project": "test-project",
            "chain": "ethereum",
            "symbol": "TEST",
            "tvlUsd": 5000.0,
            "apy": 10.0,
            "apyBase": 5.0,
            "apyReward": 5.0,
            "underlyingTokens": float("nan"),
            "rewardTokens": float("nan"),
            "timestamp": "2023-01-01T00:00:00",
        }
        row.update(kwargs)
        return row

    def test_filters_negative_apy(self, tmp_path):
        rows = [
            self._base_row(apy=-1.0, apyBase=-1.0, apyReward=-1.0),
            self._base_row(pool="pool-2", apy=5.0),
        ]
        df = pd.DataFrame(rows)
        csv_file = tmp_path / "input.csv"
        df.to_csv(csv_file, index=False)

        import os
        orig_dir = os.getcwd()
        os.chdir(tmp_path)
        try:
            prepare_snapshot(str(csv_file))
        finally:
            os.chdir(orig_dir)

        result = pd.read_csv(tmp_path / "yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["pool"] == "pool-2"

    def test_filters_low_tvl(self, tmp_path):
        rows = [
            self._base_row(tvlUsd=500.0),
            self._base_row(pool="pool-2", tvlUsd=5000.0),
        ]
        df = pd.DataFrame(rows)
        csv_file = tmp_path / "input.csv"
        df.to_csv(csv_file, index=False)

        import os
        orig_dir = os.getcwd()
        os.chdir(tmp_path)
        try:
            prepare_snapshot(str(csv_file))
        finally:
            os.chdir(orig_dir)

        result = pd.read_csv(tmp_path / "yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["pool"] == "pool-2"

    def test_excludes_pool(self, tmp_path):
        excluded_pool = "0xf4bfe9b4ef01f27920e490cea87fe2642a8da18d"
        rows = [
            self._base_row(pool=excluded_pool),
            self._base_row(pool="pool-2"),
        ]
        df = pd.DataFrame(rows)
        csv_file = tmp_path / "input.csv"
        df.to_csv(csv_file, index=False)

        import os
        orig_dir = os.getcwd()
        os.chdir(tmp_path)
        try:
            prepare_snapshot(str(csv_file))
        finally:
            os.chdir(orig_dir)

        result = pd.read_csv(tmp_path / "yield_snapshot_hourly.csv")
        assert len(result) == 1
        assert result.iloc[0]["pool"] == "pool-2"

    def test_rounds_apy_columns(self, tmp_path):
        rows = [self._base_row(apy=1.123456789, apyBase=2.987654321, apyReward=0.5)]
        df = pd.DataFrame(rows)
        csv_file = tmp_path / "input.csv"
        df.to_csv(csv_file, index=False)

        import os
        orig_dir = os.getcwd()
        os.chdir(tmp_path)
        try:
            prepare_snapshot(str(csv_file))
        finally:
            os.chdir(orig_dir)

        result = pd.read_csv(tmp_path / "yield_snapshot_hourly.csv")
        assert result.iloc[0]["apy"] == pytest.approx(1.12346, abs=1e-5)
        assert result.iloc[0]["apyBase"] == pytest.approx(2.98765, abs=1e-5)

    def test_tvl_cast_to_int(self, tmp_path):
        rows = [self._base_row(tvlUsd=12345.99)]
        df = pd.DataFrame(rows)
        csv_file = tmp_path / "input.csv"
        df.to_csv(csv_file, index=False)

        import os
        orig_dir = os.getcwd()
        os.chdir(tmp_path)
        try:
            prepare_snapshot(str(csv_file))
        finally:
            os.chdir(orig_dir)

        result = pd.read_csv(tmp_path / "yield_snapshot_hourly.csv")
        assert result.iloc[0]["tvlUsd"] == 12345
