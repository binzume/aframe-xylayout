# xyLayout

Flexbox like layout + UI components for [A-Frame](https://aframe.io/).

## Examples

Live demos:

- [Flexbox like Layout](https://binzume.github.io/aframe-xylayout/examples/layout.html)
- [UI Components](https://binzume.github.io/aframe-xylayout/examples/widgets.html) (including multi byte characters support)
- [Virtual keyboard](https://binzume.github.io/aframe-xylayout/examples/keyboard.html) (Japanese input method is available)

![Layout example](./examples/layout.png)
![UI example](./examples/ui.png)


## Usage

Use [xylayout-all.min.js](./dist/xylayout-all.min.js) (35kB)

Include `xylayout-all.min.js` after the AFrame.

```html
<script src="https://aframe.io/releases/1.1.0/aframe.min.js"></script>
<script src="https://binzume.github.io/aframe-xylayout/dist/xylayout-all.min.js"></script>
...
<a-xycontainer direction="column" spacing="0.1" padding="0.2">
    <a-xylabel value="ABC123漢字" width="2" height="0.5"></a-xylabel>
    <a-xybutton label="Button"></a-xybutton>
    <a-xyselect values="abc,123,Foo,Bar" select="1"></a-xyselect>
    <a-xytoggle value="true"></a-xytoggle>
    <a-xyrange width="4" height="0.5" value="20"></a-xyrange>
    <a-xycontainer direction="row" spacing="0.2">
        <a-box color="blue"></a-box>
        <a-box color="red"></a-box>
        <a-box color="green"></a-box>
    </a-xycontainer>
</a-xycontainer>
```

### Building xylayout-all.min.js

```bash
npm install
npm run dist
```

## Primitives

T.B.D. (See [examples](./examples))

- a-xycontainer
- a-xywindow
- a-xylabel
- a-xybutton
- a-xyrange
- a-xytoggle
- a-xyselect
- a-xyscroll
- a-xyinput
- a-xykeyboard

- The component of the same name described below is used. In addition, `xyrect` will also be attached.
- The default size of UI objects is so large, so adjust it by `scale`. 

## Components

### xycontainer

A component that layouts 3D objects on the XY plane.

[CSS Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout) linke layout is available.

Attributes:

| name | default | desc | values |
| ---- | ------- | ---- | ------ |
| direction    | column | Defining the main axis | 'row', 'column' ('horizontal', 'vertical') |
| justifyItems | start  | layout mode for along the main axis | 'center', 'start', 'end', 'space-between', 'space-around', 'stretch'|
| alignItems   | none   | layout mode for along the cross axis  |'none', 'center', 'start', 'end', 'stretch'|
| alignContent | none   | layout mode for lines, if wrap |'none', 'center', 'start', 'end', 'stretch'|
| spacing      | 0      | spacing between items | number |
| padding      | 0      | padding around items | number |
| wrap         | nowrap | wrap mode | wrap, nowrap |
| reverse      | false  | Reverse the layout direction |  |

### xyitem

A component that controls how child elements are placed in a `xycontainer`.
The properties of this component take precedence over the parameters specified in the parent container.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| align  | align   | none  | see xycontainer.alignItems |
| grow   | number  | 1     | stretch factor for growing |
| shrink | number  | 1     | stretch factor for shrinking |
| fixed  | boolean | false | ignore layout if set to true |

### xyrect

Components that provide element sizes and pivots for `xycontainer`.
By default, xycontainer uses the width and height attributes of the element. 
If width and height do not represent the actual size of the object (e.g. `a-sphere`), we need to be specified in this component.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| width  | number | -1  | width of element. use size of geometry if set to -1 |
| height | number | -1  | height of element. use size of geometry if set to -1 |
| pivot  | vec2   | (0.5, 0.5) | pivot position. bottom left is `0 0`. Most primitive of a-frame have their origin at the center(`0.5 0.5`). |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| xyresize | {xyrect} | Resize event |

### xywindow

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| title    | string   |      | title of window |
| closable | boolean  | true | closable |
| background | boolean  | true | background plane |

### xylabel

An alternative to the text component.
This component will fallback to rendering with Canvas if `value` contains multibyte characters.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| value         | string |      | text |
| renderingMode | string | auto | canvas: always use canvas for rendering. auto: use text if possible |
| resolution    | number | 32   | canvasを使う場合の高さ方向の解像度 |

see [text](https://aframe.io/docs/1.1.0/components/text.html)


### xybutton

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| color | color | | button surface color |
| hoverColor | color | | hover color |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| click |   | Click event |

### xytoggle

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| value | boolean | false | state of the toggle |

NOTE: This component defines `value` property into the DOM element.

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| change | {value} | changed event |

### xyrange

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| min   | number | 0   | min value |
| max   | number | 100 | max value |
| value | number | 0   | initial value |
| step  | number | 0   | step of value |
| thumbSize | number | 0.4 | Thumb size |

NOTE: This component defines `value` property into the DOM element.

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| change | {value} | changed event |

### xyselect

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| values | array | []    | choices |
| select | int   | 0     | selected index for the choices |
| toggle | boolean | false | If set to true, the value will toggle with each click instead of displaying the choices |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| change | {value, index} | changed event |

### xylist

List component that supports element recycling.
Intended to be used as a child element of xyscroll.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| itemWidth  | number | -1 | width of a item |
| itemHeight | number | -1 | height of a item |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| clickitem | {index} | click item event |

Method:

Needs to be initialized by `xylist.setAdapter()` and `xylist.setContents()`.
See [list example](https://binzume.github.io/aframe-xylayout/examples/list.html).

- setAdapter({createFunc, bindFunc}): set creating list elements and binding content.
- setContents(data, optional_count): set contents of list.
- setLayout({sizeFunc, targetsFunc, layoutFunc}): set custom layout (optional)

### xyclipping

表示をクリッピングするためのコンポーネント．xyscrollで使用．

子要素のサイズが親要素をはみ出す場合にレンダリング時にクリッピングされます．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| clipTop    | boolean  | true  | 上部をクリッピングします |
| clipBottom | boolean  | true  | 下部をクリッピングします |
| clipLeft   | boolean  | false | 左側をクリッピングします |
| clipRight  | boolean  | false | 右側をクリッピングします |
| exclude    | selector |       | クリッピングから除外する要素 |

THREE.js標準のシェーダを使っている場合のみ正しく動きます．例えばa-textはシェーダが専用のものなので正しくクリッピングされません．

### xyscroll

スクロールを管理するコンポーネント．
子要素の高さがはみ出す場合にスクロールバーによるスクロールができるようにします．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| scrollbar | boolean | true | スクロールバーを表示 |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| xyviewport | [t, b, l, r]| viewport change event |

- xyscroll直下に複数の要素がある場合，最初の一つがスクロール対象になります．
- このコンポーネントだけは，要素の中心ではなく左下を原点として扱います．
- スクロールバーは縦方向のみ表示します．

### xyinput

text input box.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| value | string |  | text |
| type | string |  | '', 'number', 'password' |
| placeholder | string |  | Text for placeholder |
| caretColor  | color | | Caret color |
| bgColor  | color | white | Background color |

NOTE: This component defines `value` property into the DOM element.

### xykeyboard

A component displays screen keyboard. Sends `KeyboardEvent` to the focused element.

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| ime | boolean | false | Enable Japanese input method |

# License

MIT License
