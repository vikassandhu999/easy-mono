---
name: design-pro
description: Converts claude design dc.html file designs to React Applications with existing design system.
---

- Find correct state and render those in browser.
- See at ref snapshots and create the design using the projects design system as faithfully as possible.
- Find correct html from dc.html file for each corresponding component in react application design.
- For each component: Use insider to find correct rendered styles and compare them with dc.html corresponding component styles.
  - if styles differ, use decision ladder to make decide best place for the style to be applied.
    - something generic which needs to be done everywhere in the app? goes to theme overrides.
    - only this component requires it? inline the design using tailiwind classes.
    - do this for all the components mapping.
    - don't write any code before you have all the mappings correct.
- states
  - 