PHASE_1A_USER_APPROVAL=APPROVED
PHASE_1A_FINAL_STATUS=PASS
PHASE_1B_STATUS=NOT_READY

DESIGN_BASELINE_COMMIT=f49dd3886f6fff4d05b692c793757398dbc756fa

# ENHE Phase 1A final approval

## Decision

The user approved the final Phase 1A design represented by the immutable design baseline commit above. The approved scope is the design system, public header, homepage, five-product presentation, testimonials, footer, AI tools page, sign-in and registration page, Chinese and English variants, and responsive behavior recorded under `docs/enhe-redesign/phase-1a/`.

Implementation must follow this approved design. It must not silently change the approved information architecture, locked copy, product order, interactions, language mirrors, or responsive rules. Any later design change requires a new, explicit user decision record that identifies the change and its replacement baseline.

## Acceptance evidence

- Browser assertions: 195/195 passed, 0 failed.
- Contract assertions: 283/283 passed, 0 failed.
- Visual-polish assertions: 93/93 passed, 0 failed.
- Twelve final screenshots were independently re-read from PNG headers and re-hashed at approval time.

| filename | width | height | bytes | SHA-256 |
|---|---:|---:|---:|---|
| zh-home-1440.png | 1440 | 2615 | 351185 | EAE9917D471F68EF67F6DE427EC1DE78A47C4379F1377D1EDA9C8CE3B606E060 |
| zh-home-390.png | 390 | 3145 | 168308 | 6F3EF3373C60E66A6A689F7CAFC7F9BDFE88F930214727B9063C4C8B637C0DAA |
| zh-software-1440.png | 1440 | 3223 | 896591 | 88F93293CD0FE641FA332233DAEFB3CBB3730F2C7126705F59E037AF2EF8C2DC |
| zh-software-390.png | 390 | 7405 | 798827 | 5D8FADF6D71922013AC0E684294F3FF2A21EEB4116DEA3EFF14F7988BF18476B |
| zh-signin-1440.png | 1440 | 900 | 28278 | 8E7F3E177E06C0EAC0448965ABC2B38F95AE24CA094723D87FDCA3E664BE50D5 |
| zh-signin-390.png | 390 | 844 | 22402 | DCAD7F3AAD56D9F258D74FDB525B437C4A7F1FB52902B77056C5D7AC6A790452 |
| en-home-1440.png | 1440 | 2644 | 348878 | 4E9DD8C50AB7FF9FB45F59CDB090D18114F4DD1861A9C2CB844B2963F6B997C3 |
| en-home-390.png | 390 | 3282 | 166812 | DF52ACD539A0C5CB5FDCF6A0AD4F71FEFD8982F4AC94FFFD453B9DB35E8DA729 |
| en-software-1440.png | 1440 | 3346 | 851402 | A964046D8CA4AD15E3F9DFE5F1E4B19B343FC0B014934E468FC0DD48A528CFD4 |
| en-software-390.png | 390 | 7877 | 751312 | 0D659E03F11F052C2CB26424D17E6E10450EDBF8E363375DB1FA479A60D4C582 |
| en-signin-1440.png | 1440 | 900 | 26326 | AED734BABC37C207B2551D33A7DDFDFFFFAF2BC0F7F9AB311F70C24B0B63F148 |
| en-signin-390.png | 390 | 844 | 20920 | E2583BBCB8288A6FD8D8ED694CEB8781F4323537F34EE74C78E5D82D3753FDF9 |

## Boundary

Phase 1A approval confirms design evidence only. It does not mean Phase 1B is ready, commerce or transaction paths are ready, product detail and download boundaries are closed, or the site is ready for deployment or production release.
