// NOTE: This file is not used in "npm run dist".

if (typeof AFRAME === 'undefined') {
    throw new Error('AFRAME is not loaded.');
}

require('./aframe-xylayout.js');
require('./aframe-xywidget.js');
require('./aframe-xyinput.js');
