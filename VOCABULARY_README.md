# Chinese-to-English game vocabulary

Import `chinese_to_english_game.csv` as UTF-8 with BOM (`utf-8-sig` in Python).
The BOM helps spreadsheet applications recognize Chinese text. Use a CSV parser;
examples containing commas and quotation marks are quoted automatically.

The file contains **1,376 learning entries**:

- 1,176 ordinary vocabulary entries: 1,174 distinct English headwords, including
  1,134 single-token headwords and 40 useful multiword terms.
- 100 idioms, including common sayings and figurative phrases.
- 100 slang or informal expressions, including conversational contractions and
  texting abbreviations. This category deliberately includes everyday informal
  English as well as slang in the narrower sense.

Chinese definitions, categories, and translations use Simplified Chinese.
The supplied `mmd_to_english_20261112.csv` informed the practical topic selection;
exact matching senses from its priority-1 vocabulary also inform priority.
This is a curated learning set, not a cleaned copy of every original entry.

| Column | Meaning |
| --- | --- |
| `id` | Unique integer learning-entry ID |
| `simplified chinese` | Chinese gloss for the particular sense taught |
| `english` | English word or expression |
| `category layer 1` | Broad topic in Chinese |
| `category layer 2` | More specific topic in Chinese |
| `priority` | Encounter-frequency learning tier; smaller means higher priority |
| `example sentence in english` | Example using the taught sense |
| `example sentence chinese translation` | Natural Chinese translation of that example |
| `part of speech` | Grammatical role in the example |
| `is idiom` | `1` for idioms/sayings, otherwise `0` |
| `is slang` | `1` for slang/informal entries, otherwise `0` |
| `pronunciation` | Broad American English IPA, enclosed in `/ /` |

Priority is an editorial estimate of likely encounters in everyday conversation,
travel, work, study, and online communication, not a measured corpus-frequency rank:

- **1:** Essential, very common vocabulary, plus practical top-priority terms from
  the supplied file.
- **2:** Common everyday vocabulary and widely useful expressions.
- **3:** Less frequent, topic-specific vocabulary or more informal expressions.
- **4:** More context-dependent or niche expressions.
- **5:** Reserved for rare entries; not used in this version.

The two indicator columns are mutually exclusive for convenient game modes. Some
expressions could linguistically belong to both categories; the flag records their
chosen teaching category. Multiple senses can share an English spelling: for
example, `book` as a noun and verb, or `sick` as ordinary vocabulary and slang.
Use `id`, not the English spelling alone, as the game key.

Pronunciation tips for Chinese-speaking learners:

- `ˈ` 表示主重音，`ˌ` 表示次重音；如 `/kəmˈpjutər/` 的重音在第二音节。
- `/θ/` 和 `/ð/` 都要让舌尖轻触上下齿之间；前者不振动声带，后者振动。
- `/ɪ/`（如 `sit`）与 `/i/`（如 `see`）不同；`/æ/`（如 `cat`）需要张大嘴。
- `/ə/` 是轻读的中央元音，不要把每个音节都读得同样重。
- `/r/` 采用美式发音。短语音标展示基本读音，实际对话中可能出现连读和弱读。
- 缩写有的按字母读（如 `DM`），有的作为一个词读（如 `FOMO`）；音标给出一种常用读法。

Slang glosses identify informality and flag rude language where applicable. These
are learning examples, not a recommendation to use slang in formal writing.
Some words have additional meanings or pronunciations beyond the sense shown.

To rebuild and validate:

```sh
python3 data_tools/build_vocabulary.py
```

No third-party dependencies are required. The build checks IDs through sequential
generation, duplicate entry keys, nonempty fields, priority bounds, expression
counts, example inclusion, 1,000+ distinct ordinary single-token headwords, and CSV
round-trip parsing. Source content lives in `data_tools/build_vocabulary.py`,
`data_tools/examples.txt`, `data_tools/idioms.txt`, and `data_tools/slangs.txt`.
Grouped vocabulary examples in `examples.txt` use `headword|English sentence|Chinese translation`,
with one individually written example per headword.
