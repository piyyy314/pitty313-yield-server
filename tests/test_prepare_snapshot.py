import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from prepareSnapshot import replaceFunc


def test_replaceFunc_null():
    assert replaceFunc("[null]") == "[]"


def test_replaceFunc_null_null():
    assert replaceFunc("[null,null]") == "[]"


def test_replaceFunc_leading_null():
    assert replaceFunc("[null,0x123]") == "[0x123]"


def test_replaceFunc_trailing_null():
    assert replaceFunc("[0x123,null]") == "[0x123]"


def test_replaceFunc_no_null():
    assert replaceFunc("[0x123]") == "[0x123]"
