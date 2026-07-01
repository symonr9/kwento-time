import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildDeviceContactName } from './contact-normalization';

describe('contact normalization', () => {
  it('prefers a trimmed full name when present', () => {
    assert.equal(
      buildDeviceContactName({ familyName: 'Doe', fullName: '  Jane Q. Doe  ', givenName: 'Jane' }),
      'Jane Q. Doe',
    );
  });

  it('falls back to trimmed given and family names', () => {
    assert.equal(
      buildDeviceContactName({ familyName: '  Santos ', fullName: ' ', givenName: ' Ana ' }),
      'Ana Santos',
    );
  });

  it('returns an empty string when no usable name exists', () => {
    assert.equal(buildDeviceContactName({ familyName: ' ', fullName: null, givenName: undefined }), '');
  });
});
