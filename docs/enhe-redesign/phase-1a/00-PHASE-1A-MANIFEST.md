PHASE_1A_USER_APPROVAL=APPROVED
PHASE_1A_FINAL_STATUS=PASS
PHASE_1B_STATUS=NOT_READY

# ENHE Phase 1A final approved manifest

This delivery is a visual-polish change on top of `eaba93e700ce025e577c25dbe881160c5d63c9fe`. It contains design documents, local static HTML/CSS/JavaScript, original SVG avatars, locally copied public ENHE product media, and browser evidence only.

## Locked delivery

- Six mirrored pages: Chinese/English home, software, and sign-in.
- Public shell with the approved navigation order and a non-sticky home header.
- Centered home composition, five verified ENHE products, five approved experience examples, and the approved footer columns.
- Software page with a custom category layer, three named sections, twelve verified ENHE records, real prices/free labels, and crawlable pagination affordance.
- Sign-in default state with no diagnostic controls visible.
- Contract verifier, command log, acceptance result, and 12 full-page screenshots at exact viewport widths.
- One responsive yellow label: desktop brand region only, mobile home H1 only.
- Seven locally stored public ENHE media assets with a source/hash/boundary manifest.
- Mobile horizontal, keyboard-operable new/featured product rows while all products remain one column.
- Local inline Google/GitHub sign-in icons and the approved final English value statement.

## Gate state

`PHASE_1A_2_STATUS=PASS` is supported by both verifiers, the five-viewport browser matrix, all 12 regenerated screenshot checks, the Git scope audit, and ZIP integrity checks.
`PHASE_1A_USER_APPROVAL=APPROVED` and `PHASE_1A_FINAL_STATUS=PASS` record the user's final approval of this design baseline.
`PHASE_1B_STATUS=NOT_READY` remains mandatory while Phase 1B gates are not independently closed.

The immutable approval record is `16-PHASE-1A-FINAL-APPROVAL.md`. Any later design change requires a new user decision record.

Only `docs/enhe-redesign/phase-1a/**` is in scope. No application, schema, package, environment, production, or remote files were changed.
