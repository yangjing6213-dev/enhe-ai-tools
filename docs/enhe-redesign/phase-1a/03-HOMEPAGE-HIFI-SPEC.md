# Homepage high-fidelity contract

The home is a centered sequence: header → centered H1 → centered subtitle → one green CTA → large 16:9 product stage → five-review horizontal carousel → final value statement → one green CTA → minimal footer. The yellow label belongs to the desktop header brand region; below 768px it moves to the position immediately above H1. There is no split hero and no second first-screen button.

Locked Chinese copy:

- Label: `给人生加一个 AI 外挂`
- H1: `一站式AI平台`
- Subtitle: `发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。`
- CTA: `开始探索AI`, `/software`
- Value: `让每一个普通人，都能借助 AI，创造过去做不到的事。`

Locked English value copy: `Let everyone use AI to create what once felt out of reach.` The English CTA remains `Start exploring AI` and maps to `/en/software`.

The five semantic product panels are all in the DOM, show `01 / 05`, use locally copied public ENHE 16:9 covers with a readable product-name plate and text fallback, and expose previous/next buttons plus a detail link. The assets and hashes are frozen in `prototype/assets/product-media-manifest.json`; no remote hotlink or delivery field is used. The review carousel opens on a centered middle record so both neighboring records are visible with the approved side fade; it never auto-advances products.
