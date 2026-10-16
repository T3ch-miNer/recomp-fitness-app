# Recomp premium v2.2.1 review candidate — not published

User-supplied v2.2 redesign preserved: Bricolage Grotesque + Inter, two themes, premium navigation, activity rings, weight chart, circular rest timer, splash and icons. Existing food and local-storage modules left unchanged.

QA fixes:
- Google Fonts stylesheet now loads asynchronously, falling back immediately to system fonts if offline or blocked, protecting the recent startup recovery.
- Remove the double-layer/nested background around the food portion number control.
- Update asset and service-worker cache version to force a clean reload when ultimately published.

Verified using Chromium mobile emulation at 393px: Home, Workout, Nutrition, Body switching; navigation selection centred; search / food review; meal order Date > Meal > Portion; workout set 1 kg copied only within the exercise; rest timer ring; Light and Dark layouts. Android hardware camera / photo model / Google Font network downloads were not tested.

No GitHub commits or live site modifications.
