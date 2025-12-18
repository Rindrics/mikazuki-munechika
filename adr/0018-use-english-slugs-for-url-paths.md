# ADR 0018: Use English Slugs for URL Paths

## Status

Accepted

## Context

URL パス `/assess/[stock]` では日本語の資源名（例: `マイワシ太平洋系群`）を `encodeURIComponent` でエンコードして使用していた。これにより以下の問題が発生していた：

1. **URL の可読性**: `/assess/%E3%83%9E%E3%82%A4%E3%83%AF%E3%82%B7...` のような URL は人間が読めない
2. **ログの文字化け**: サーバーログやアクセスログで日本語がエンコードされた状態で記録される
3. **デバッグ困難**: URL を見てもどの資源を指しているか即座に判断できない

ADR 0016 では「ドメインコードに日本語を使用する」と決定したが、これは**コード内の識別子**に関する決定であり、**外部インターフェース（URL）** には適用されない。

## Decision

URL パスには日本語の資源名ではなく、英語の slug を使用する。

### 実装方針

資源名を英語に「置き換える」のではなく、`資源情報` に `slug` フィールドを追加し、各資源が自身の英語表記を出力できるようにする。

### マッピング例

| 資源名                                 | 英語 slug                     |
| -------------------------------------- | ----------------------------- |
| マイワシ太平洋系群                     | maiwashi_pacific              |
| マイワシ対馬暖流系群                   | maiwashi_tsushima             |
| ズワイガニオホーツク海系群             | zuwaigani_okhotsk             |
| マチ類（奄美諸島・沖縄諸島・先島諸島） | machi_amami_okinawa_sakishima |

### 実装

1. `系群情報` インターフェースに `slug` フィールドを追加
2. `資源情報` インターフェースに `readonly slug: string` を追加
3. `create資源情報()` で slug を設定

### URL 形式

- Before: `/assess/%E3%83%9E%E3%82%A4%E3%83%AF%E3%82%B7%E5%A4%AA%E5%B9%B3%E6%B4%8B%E7%B3%BB%E7%BE%A4`
- After: `/assess/maiwashi_pacific`

## Consequences

### Benefits

1. **可読性向上**: URL を見るだけでどの資源か判断可能
2. **ログの可読性**: サーバーログやアクセスログが読みやすくなる
3. **デバッグ容易**: 問題発生時に URL から対象資源を即座に特定可能
4. **URL 共有**: 英語 slug は他システムとの連携やブックマークに適している
5. **ADR 0016 との整合性**: ドメインコードは日本語を維持しつつ、外部インターフェースは英語

### Drawbacks

1. **マッピング管理**: 資源追加時に slug も定義が必要
2. **逆引きロジック**: slug から資源名への変換が必要

### Related ADRs

- ADR 0016: Use Japanese for Domain Code for Stakeholder Communication
