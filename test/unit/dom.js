import helperElement from '../lib/element';
import helperFixture from '../lib/fixture';
import skate, { init, ready } from '../../src/index';

describe('dom', function () {
  describe('general', function () {
    it('should pick up nodes already in the DOM.', function (done) {
      var calls = 0;
      var tag = helperElement().safe;

      init(helperFixture(`<div><${tag}></${tag}></div>`));
      skate(tag, {
        created () {
          ++calls;
        }
      });

      ready(helperFixture().querySelector(tag), function () {
        expect(calls).to.equal(1);
        done();
      });
    });

    it('should pick up nodes attached to the DOM after they are defined.', function (done) {
      var calls = 0;
      var tag = helperElement().safe;

      skate(tag, {
        attached: function () {
          ++calls;
        }
      });

      init(helperFixture(`<div><${tag}></${tag}></div>`));
      ready(helperFixture().querySelector(tag), function () {
        expect(calls).to.equal(1);
        done();
      });
    });

    it('should pick up descendants that are attached as part of an HTML block.', function (done) {
      var calls = 0;
      var tag = helperElement().safe;

      skate(tag, {
        attached: function () {
          ++calls;
        }
      });

      init(helperFixture(`<div><${tag}></${tag}></div>`));
      ready(helperFixture().querySelector(tag), function () {
        expect(calls).to.equal(1);
        done();
      });
    });

    // IE 11 has a bug: https://connect.microsoft.com/IE/feedback/details/817132/ie-11-childnodes-are-missing-from-mutationobserver-mutations-removednodes-after-setting-innerhtml.
    it('should pick up descendants that are detached if an ancestor\'s innerHTML is set.', function (done) {
      var tag = helperElement().safe;
      var detached = false;

      skate(tag, {
        detached () {
          detached = true;
        }
      });

      helperFixture(`<div><child><${tag}></${tag}></child></div>`);
      ready(helperFixture().querySelector(tag), function () {
        helperFixture('');
        setTimeout(function () {
          expect(detached).to.equal(true);
          done();
        }, 1);
      });
    });

    // IE 9 / 10 have the same bug with removeChild() as IE 11 does with innerHTML.
    it('should pick up descendants that are detached if an ancestor is detached.', function (done) {
      var tag = helperElement().safe;
      skate(tag, {
        detached: function () {
          done();
        }
      });

      init(helperFixture(`<div id="removing"><child><${tag}></${tag}></child></div>`));
      helperFixture().removeChild(document.getElementById('removing'));
    });
  });

  describe('SVG', function () {
    it('should work for any SVG element', function () {
      var tag = helperElement().safe;
      var calls = 0;

      skate(tag, {
        created () {
          calls++;
        },
        extends: 'path',
        prototype: Object.create(SVGElement.prototype)
      });

      helperFixture(`
        <svg>
          <circle />
          <path is="${tag}" />
        </svg>
      `);

      expect(calls).to.equal(1);
    });
  });

  describe('Document Fragments', function () {
    var frag;
    var created;
    var attached;
    var MyEl;

    beforeEach(function () {
      created = false;
      attached = false;
      MyEl = skate(helperElement('my-element').safe, {
        created: function () {
          created = true;
        },
        attached: function () {
          attached = true;
        }
      });
      frag = document.createDocumentFragment();
    });

    it('should not call attached when initialised inside a document fragment', function () {
      var myEl = new MyEl();

      frag.appendChild(myEl);
      init(frag);

      expect(created).to.equal(true);
      expect(attached).to.equal(false);
    });

    it('GH-118 - should not trigger the element is inserted, removed and then put into a fragment', function (done) {
      var div = document.createElement('div');

      document.body.appendChild(div);
      frag.appendChild(div);

      setTimeout(function () {
        done();
      }, 1);
    });
  });

  describe('Should guard against nodes that may not fully implement the HTMLElement interface', function () {
    function createElementAndRemove (prop) {
      var el = document.createElement('div');
      Object.defineProperty(el, prop, { get: () => undefined });
      expect(el[prop]).to.equal(undefined);
      return el;
    }

    it('tagName', function () {
      var el = createElementAndRemove('tagName');
      init(el);
    });

    it('childNodes', function () {
      var el = createElementAndRemove('childNodes');
      init(el);
    });
  });
});
