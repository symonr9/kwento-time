import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isUnsafeAvatarUri } from './avatar-sql';

describe('avatar URI safety', () => {
  it('rejects inline image data and oversized URIs', () => {
    assert.equal(isUnsafeAvatarUri('data:image/png;base64,abc'), true);
    assert.equal(isUnsafeAvatarUri(`file:///${'a'.repeat(2050)}`), true);
  });

  it('allows normal file and content URIs', () => {
    assert.equal(isUnsafeAvatarUri('file:///avatar.jpg'), false);
    assert.equal(isUnsafeAvatarUri('content://contacts/avatar/1'), false);
    assert.equal(isUnsafeAvatarUri(null), false);
  });
});
