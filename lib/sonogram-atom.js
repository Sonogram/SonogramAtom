'use babel';

import SonogramAtomView from './sonogram-atom-view';
import { CompositeDisposable, Point, Range } from 'atom';
import _ from 'lodash';
import WebSocket from 'ws';

export default {

  sonogramAtomView: null,
  modalPanel: null,
  subscriptions: null,
  active: false,
  markers: [],

  // Keep a dictionary mapping integers to words
  jump: {},

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
        editor = atom.workspace.getActiveTextEditor()
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
          case "jump":
            // If there's a target, jump there now
            if (msg.target){
              // Jump
              editor.setCursorBufferPosition(this.jump[msg.target].start);

              // Clean up the markers
              for (let marker of this.markers){
                marker.destroy();
              }
            }

            // If there isn't, show the jump labels
            else {
              // Reset the jump table
              this.jump = {};

              // Mark each word
              let i = 0;
              editor.scan(/\w+\b/gm, result => {
                const range = result.range;

                // Save the range
                this.jump[i] = range;

                // Calculate the centre of the word, so we can decorate it
                const midcol = Math.floor(
                  (range.start.column + range.end.column) / 2
                );
                const midpoint = new Range(
                  new Point(range.start.row, midcol),
                  new Point(range.end.row, midcol + 1),
                );

                // Create the decoration
                const overlay = document.createElement('div');
                overlay.classList.add('sonogram-atom');
                overlay.classList.add('jump-grid');
                overlay.textContent = i.toString();
                marker = editor.markBufferRange(midpoint);
                decoration = editor.decorateMarker(marker, {type: 'overlay', item: overlay});

                // Keep track of the markers
                this.markers.push(marker);

                // Move to the next number
                i++;
              });
            }
          break;
        }
      });
    }
    else {
      ws = null;
    }
  }
};
