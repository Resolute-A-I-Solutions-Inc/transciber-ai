from app.languages import AUTO, is_valid_code, language_options, normalize_language


def test_auto_detect_is_first():
    opts = language_options()
    assert opts[0] == {"code": "auto", "name": "Auto-detect"}


def test_contains_common_languages_by_code():
    codes = {o["code"] for o in language_options()}
    assert {"en", "es", "fr", "de", "ja"} <= codes


def test_all_options_have_valid_codes():
    for opt in language_options():
        assert is_valid_code(opt["code"]), opt


def test_normalize_auto_returns_none():
    assert normalize_language(AUTO) is None
    assert normalize_language("") is None
    assert normalize_language(None) is None


def test_normalize_known_code_passthrough():
    assert normalize_language("en") == "en"


def test_normalize_unknown_code_falls_back_to_none():
    assert normalize_language("not-a-language") is None
