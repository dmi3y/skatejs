import element from '../../lib/element';
import fixture from '../../lib/fixture';
import ready from '../../../src/api/ready';
import skate from '../../../src/index';

describe('lifecycle/attribute-changed', function () {
  it('should be invoked for attributes that exist on the element when it is created', function (done) {
    const tag = element();
    const elem = document.createElement(tag.safe);
    fixture(elem);
    elem.setAttribute('test', 'testing');
    expect(elem.hasAttribute('defined')).to.equal(false);
    tag.skate({
      observedAttributes: ['test'],
      attributeChanged (elem, data) {
        if (data.name === 'defined') {
          return;
        }
        expect(data.name).to.equal('test');
        expect(data.oldValue).to.equal(undefined);
        expect(data.newValue).to.equal('testing');
        done();
      }
    });
  });

  it('should only be invokable after the created lifecycle has completed', function (done) {
    const calls =  [];
    const elem = element().skate({
      observedAttributes: ['test'],
      attributeChanged (elem, data) {
        calls.push(data.name + ':' + data.oldValue + ':' + data.newValue);
      },
      created (elem) {
        // This should not trigger attributeChanged.
        elem.setAttribute('test', 'created');
        expect(calls.length).to.equal(0, 'inside created() lifecycle');
      },
      render (elem) {
        // This should not trigger attributeChanged.
        elem.setAttribute('test', 'render');
        expect(calls.length).to.equal(0, 'inside render() lifecycle');
      },
      ready (elem) {
        // This should not trigger attributeChanged. However, this should set
        // the attribute and it should be initialised after the created callback.
        elem.setAttribute('test', 'ready');
        expect(calls.length).to.equal(0, 'inside ready() lifecycle');
      }
    })();

    ready(elem, function () {
      // We set a timeout here to ensure that the created lifecycle has time to
      // call attributeChanged() for all existing attributes since this happens
      // after ready() is invoked. This is what happens in native v1, so this
      // should pass for that, too. In native, you wouldn't need this because
      // the element would be initialised prior to calling ready(). In polyfill
      // we must use ready() to do stuff when the element is initialised.
      setTimeout(function () {
        // Initialisations should have happened. Since we setAttribute()
        // within created(), we should expect this to have initialised based on
        // that setting.
        expect(calls.length).to.equal(1, 'inside setTimeout()');
        expect(calls[0]).to.equal('test:undefined:ready', 'inside setTimeout()');

        // This should now trigger since initialisation has occurred.
        elem.setAttribute('test', 'setTimeout');

        expect(calls.length).to.equal(2);
        expect(calls[0]).to.equal('test:undefined:ready', 'inside setTimeout()');
        expect(calls[1]).to.equal('test:ready:setTimeout', 'inside setTimeout()');

        done();
      }, 1);
    });
  });

  describe('observed attributes', function () {
    it('should allow an array as observedAttributes', function (done) {
      const calls = [];
      const elem = element().skate({
        observedAttributes: ['test-attr'],
        attributeChanged (elem, data) {
          calls.push(data.name);
        }
      })();

      fixture(elem);

      ready(elem, function () {
        elem.setAttribute('test-attr', '');
        elem.setAttribute('test-prop', '');
        expect(calls.length).to.equal(1);
        expect(calls[0]).to.equal('test-attr');
        done();
      });
    });

    it('should automatically observe linked attributes', function (done) {
      const calls = [];
      const elem = element().skate({
        props: {
          testProp: { attribute: true }
        },
        attributeChanged (elem, data) {
          calls.push(data.name);
        }
      })();

      fixture(elem);

      ready(elem, function () {
        elem.setAttribute('test-attr', '');
        elem.setAttribute('test-prop', '');
        expect(calls.length).to.equal(1);
        expect(calls[0]).to.equal('test-prop');
        done();
      });
    });

    it('should fire for both observedAttributes added to the array and linked attributes', function (done) {
      const calls = [];
      const elem = element().skate({
        observedAttributes: ['test-attr'],
        props: {
          testProp: { attribute: true }
        },
        attributeChanged (elem, data) {
          calls.push(data.name);
        }
      })();

      fixture(elem);

      ready(elem, function () {
        elem.setAttribute('test-attr', '');
        elem.setAttribute('test-prop', '');
        expect(calls.length).to.equal(2);
        expect(calls[0]).to.equal('test-attr');
        expect(calls[1]).to.equal('test-prop');
        done();
      });
    });

    it('should fire for both observedAttributes and properties even if the property is the same as an attribute added manually', function (done) {
      const calls = [];
      const elem = element().skate({
        observedAttributes: ['test-attr'],
        props: {
          testAttr: { attribute: true }
        },
        attributeChanged (elem, data) {
          calls.push(data.name);
        }
      })();

      fixture(elem);

      ready(elem, function () {
        elem.setAttribute('test-attr', '');
        elem.setAttribute('test-prop', '');
        expect(calls.length).to.equal(1);
        expect(calls[0]).to.equal('test-attr');
        done();
      });
    });
  });

  describe('Callback', function () {
    let myToggle;
    let spy;

    beforeEach(function () {
      spy = sinon.spy();
      let MyToggle = element().skate({
        observedAttributes: ['defined', 'name'],
        attributeChanged: spy
      });
      myToggle = new MyToggle();
    });

    it('should properly call the attribute callback for defined', function(done) {
      let resolvedSpy = spy.withArgs(myToggle, sinon.match({name: 'defined', newValue: '' }));

      ready(myToggle, function() {
        expect(resolvedSpy.callCount).to.equal(1);
        done();
      });
    });

    it('should call the callback just like attributeChangedCallback', function(done) {
      let newValueSpy = spy.withArgs(myToggle, sinon.match({name: 'name', newValue: 'created', oldValue: undefined}));
      let updatedValueSpy = spy.withArgs(myToggle, sinon.match({name: 'name', newValue: 'updated', oldValue: 'created'}));
      let removeValueSpy = spy.withArgs(myToggle, sinon.match({name: 'name', newValue: undefined, oldValue: 'updated'}));

      myToggle.setAttribute('name', 'created');
      myToggle.setAttribute('name', 'updated');
      myToggle.removeAttribute('name');

      ready(myToggle, () => {
        expect(newValueSpy.calledOnce).to.be.true;
        expect(updatedValueSpy.calledOnce).to.be.true;
        expect(removeValueSpy.calledOnce).to.be.true;
        sinon.assert.callOrder(newValueSpy, updatedValueSpy, removeValueSpy);
        done();
      });
    });
  });

  describe('Attributes added via HTML', function () {
    it('should ensure the callback is called for attributes already on the element when it is initialised', function () {
      var called = false;
      var tag = element();

      skate(tag.safe, {
        observedAttributes: ['defined'],
        attributeChanged () {
          called = true;
        }
      });

      tag.create();
      expect(called).to.equal(true);
    });
  });
});
