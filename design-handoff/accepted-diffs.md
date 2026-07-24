# accepted-diffs — user-approved deviations from the dc.html designs

The ONLY place a design↔app difference is allowed to live. `style-diff.mjs`
reads the backticked keys below and reports matching diffs as "(ledgered)"
instead of failing.

**Agents never edit this file.** Propose entries in the port ticket (key +
values + reason); the user approves and commits them here.

Key format: `` `<manifest-id>:<state>:<pair>:<property>` ``
(e.g. `` `CD-OV:active:header-name:font-size` ``)

| Key | Design value | App value | Reason | Approved |
|---|---|---|---|---|
