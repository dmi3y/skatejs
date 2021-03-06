import helperElement from '../lib/element';
import helperFixture from '../lib/fixture';

import skateMaster, { version } from '../../src/index';
import '../skate/0.14.3.js';

const { skate } = window;

// We do this so the test can call the same skateAndCreate() function.
skateMaster.version = version;

describe('multiple-versions', function () {
  it('is possible to have multiple versions of skate on the page', function (done) {
    let called = [];

    function skateAndCreate(customSkate) {
      const el = helperElement();
      customSkate(el.safe, {
        created () {
          called.push(customSkate.version);
        }
      });
      let elem = document.createElement(el.safe);
      helperFixture(elem);
    }

    skateAndCreate(skateMaster);
    skateAndCreate(skate);

    setTimeout(function () {
      expect(called.sort()).to.deep.equal([version, skate.version].sort());
      done();
    }, 1);
  });
});
