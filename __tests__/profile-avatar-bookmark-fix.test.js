/**
 * Regression tests for two Profile-tab bugs found during the 2026-07 forensic
 * sweep (see SYSTEM_MAP.md):
 *
 * 1. The avatar circle had its OWN broken picker: it called
 *    ImagePicker.launchImagePickerAsync (does not exist in expo-image-picker;
 *    the real method is launchImageLibraryAsync) and uploaded to a literal
 *    placeholder string 'YOUR_UPLOAD_ENDPOINT'. Tapping the avatar always
 *    threw. Fixed by removing the duplicate and routing the tap through the
 *    already-working Edit Profile flow (DetailsFormCard -> uploadAvatar).
 *    A second, independent bug in the same code path: the avatar Image read
 *    `resolvedProfile.photoUrl`, but userService.getCurrentUser() returns the
 *    field as `profilePhoto` — so even a successful upload would never
 *    render.
 *
 * 2. Tapping an individual saved bookmark called the same handler as the
 *    section's "view all" button, so it never opened the bookmark's content.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'components', 'ProfileScreen.js'),
  'utf8'
);

describe('ProfileScreen avatar picker', () => {
  test('does not import expo-image-picker (no duplicate/broken picker)', () => {
    expect(SRC).not.toMatch(/from ['"]expo-image-picker['"]/);
  });

  test('does not call the nonexistent launchImagePickerAsync', () => {
    expect(SRC).not.toContain('launchImagePickerAsync');
  });

  test('does not post to the placeholder upload endpoint', () => {
    expect(SRC).not.toContain('YOUR_UPLOAD_ENDPOINT');
  });

  test('avatar tap opens Edit Profile (the working upload path)', () => {
    expect(SRC).toMatch(/onPress=\{?\(\)\s*=>\s*navigateToScreen\('EditProfile'\)\}?/);
  });

  test('reads the avatar photo under the field userService actually returns', () => {
    expect(SRC).toContain('resolvedProfile?.profilePhoto');
    expect(SRC).not.toContain('resolvedProfile?.photoUrl');
    expect(SRC).not.toContain('resolvedProfile.photoUrl');
  });
});

describe('ProfileScreen bookmark tap', () => {
  test('exposes a handler that opens bookmark content instead of just "view all"', () => {
    expect(SRC).toContain('handleBookmarkPress');
  });

  test('individual bookmark rows call the content-opening handler', () => {
    expect(SRC).toMatch(/onPress=\{\(\)\s*=>\s*handleBookmarkPress\(bookmark\)\}/);
  });

  test('receives onOpenArticle from the parent (App.js already passes it)', () => {
    expect(SRC).toMatch(/function ProfileScreen\(\{[^}]*onOpenArticle[^}]*\}\)/);
  });

  test('news-type bookmarks are reconstructed into a shape AIAnalysisOverlay accepts', () => {
    expect(SRC).toContain("bookmark.type === 'news'");
    expect(SRC).toContain('sourceUrl: bookmark.sourceUrl');
  });
});
