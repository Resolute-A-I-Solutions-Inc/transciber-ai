"""Whisper language helpers.

The dropdown must send Whisper *language codes* (e.g. ``en``), never display
names. ``LANGUAGES`` maps code -> English name and is the authoritative list.
"""
from __future__ import annotations

from typing import Optional

AUTO = "auto"

# The canonical Whisper language set (code -> English name), inlined so the
# backend does not depend on the heavy ``openai-whisper`` package. faster-whisper
# supports this same set. Keep in sync with openai-whisper's tokenizer.LANGUAGES.
LANGUAGES = {
    "en": "english", "zh": "chinese", "de": "german", "es": "spanish", "ru": "russian",
    "ko": "korean", "fr": "french", "ja": "japanese", "pt": "portuguese", "tr": "turkish",
    "pl": "polish", "ca": "catalan", "nl": "dutch", "ar": "arabic", "sv": "swedish",
    "it": "italian", "id": "indonesian", "hi": "hindi", "fi": "finnish", "vi": "vietnamese",
    "he": "hebrew", "uk": "ukrainian", "el": "greek", "ms": "malay", "cs": "czech",
    "ro": "romanian", "da": "danish", "hu": "hungarian", "ta": "tamil", "no": "norwegian",
    "th": "thai", "ur": "urdu", "hr": "croatian", "bg": "bulgarian", "lt": "lithuanian",
    "la": "latin", "mi": "maori", "ml": "malayalam", "cy": "welsh", "sk": "slovak",
    "te": "telugu", "fa": "persian", "lv": "latvian", "bn": "bengali", "sr": "serbian",
    "az": "azerbaijani", "sl": "slovenian", "kn": "kannada", "et": "estonian", "mk": "macedonian",
    "br": "breton", "eu": "basque", "is": "icelandic", "hy": "armenian", "ne": "nepali",
    "mn": "mongolian", "bs": "bosnian", "kk": "kazakh", "sq": "albanian", "sw": "swahili",
    "gl": "galician", "mr": "marathi", "pa": "punjabi", "si": "sinhala", "km": "khmer",
    "sn": "shona", "yo": "yoruba", "so": "somali", "af": "afrikaans", "oc": "occitan",
    "ka": "georgian", "be": "belarusian", "tg": "tajik", "sd": "sindhi", "gu": "gujarati",
    "am": "amharic", "yi": "yiddish", "lo": "lao", "uz": "uzbek", "fo": "faroese",
    "ht": "haitian creole", "ps": "pashto", "tk": "turkmen", "nn": "nynorsk", "mt": "maltese",
    "sa": "sanskrit", "lb": "luxembourgish", "my": "myanmar", "bo": "tibetan", "tl": "tagalog",
    "mg": "malagasy", "as": "assamese", "tt": "tatar", "haw": "hawaiian", "ln": "lingala",
    "ha": "hausa", "ba": "bashkir", "jw": "javanese", "su": "sundanese", "yue": "cantonese",
}


def language_options() -> list[dict[str, str]]:
    """Return ``[{code, name}]`` with Auto-detect first, then names A→Z."""
    options = [{"code": AUTO, "name": "Auto-detect"}]
    for code, name in sorted(LANGUAGES.items(), key=lambda kv: kv[1]):
        options.append({"code": code, "name": name.title()})
    return options


def is_valid_code(code: Optional[str]) -> bool:
    return code == AUTO or code in LANGUAGES


def normalize_language(code: Optional[str]) -> Optional[str]:
    """Map a UI value to what Whisper wants: ``None`` for auto-detect, else the code.

    Unknown/empty values fall back to ``None`` (auto-detect) rather than erroring.
    """
    if not code or code == AUTO:
        return None
    return code if code in LANGUAGES else None
