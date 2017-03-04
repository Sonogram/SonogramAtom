'use babel';

import SonogramAtomView from './sonogram-atom-view';
import { CompositeDisposable } from 'atom';
import _ from 'lodash';
import WebSocket from 'ws';

export default {

  sonogramAtomView: null,
  modalPanel: null,
  subscriptions: null,
  active: false,

  activate(state) {
    this.sonogramAtomView = new SonogramAtomView(state.sonogramAtomViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.sonogramAtomView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sonogram-atom:toggle': () => this.toggle()
    }));

  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.sonogramAtomView.destroy();
  },

  serialize() {
    return {
      sonogramAtomViewState: this.sonogramAtomView.serialize()
    };
  },

  toggle() {
    editor = atom.workspace.getActiveTextEditor()

    this.active = !this.active;
    if (this.active){
      const ws = new WebSocket('ws://localhost:8080');
      ws.on('open', () => {
        console.log('Connected to Sonogram sever!');
        ws.send(JSON.stringify({
          action: 'register'
        }));
      });

      ws.on('message', (data, flags) => {
        console.log(data);
        const msg = JSON.parse(data).semantics;

        switch (msg.unit) {
          case 'line':
            editor.selectLinesContainingCursors();
            break;
          case 'word':
            editor.selectWordsContainingCursors();
            break;
        }

        switch(msg.action){
          case "delete":
            editor.delete();
          break;
          case "copy":
            editor.copySelectedText();
          break;
        }
      });
    }
    else {
      ws = null;
    }
    // let i = 0;
    //
    // editor.scan(/\w+\b/gm, result => {
    //   console.log(i);
    //   console.log(JSON.stringify(result.range, null, 4));
    //   const overlay = document.createElement('div');
    //   overlay.textContent = i.toString();
    //   marker = editor.markBufferRange(result.range);
    //   decoration = editor.decorateMarker(marker, {type: 'overlay', item: overlay});
    //   i++;
    // });
  }
};
