customElements.define("svg-progress-circle", class extends HTMLElement {
  connectedCallback() {
    let d = 'M5,30a25,25,0,1,1,50,0a25,25,0,1,1,-50,0'; // circle
    this.innerHTML =
    `<svg viewBox="0 0 60 60">
    <path stroke-dasharray="10 2"   stroke-dashoffset="-19"
    pathlength="120" d="${d}" fill="#ccc" stroke="lightgrey" stroke-width="5"/>
    <path stroke-dasharray="30 70" stroke-dashoffset="-25"
    pathlength="100" d="${d}" fill="none"
    stroke="${this.getAttribute("color") || "red"}" stroke-width="5"/>
    <text x="50%" y="57%" text-anchor="middle">30%</text></svg>`;

    this.style.display = 'inline-block';
    this.percent = this.getAttribute("percent");
  }
  set percent(val = 0) {
    val = val || 0
    this.setAttribute("percent", val);
    let dash = (val || 0)+ " " + (100 - val);
    this.querySelector("path+path").setAttribute('stroke-dasharray', dash);
    this.querySelector("text").innerHTML = (val).toFixed(0) + "%";
  }
})

function openFullscreen() {
  try {
    const elem = book.epubBody;
    var isfullscren = (elem.fullscreenElement && elem.fullscreenElement !== null) ||
    (elem.webkitFullscreenElement && elem.webkitFullscreenElement !== null) ||
    (elem.mozFullScreenElement && elem.mozFullScreenElement !== null) ||
    (elem.msFullscreenElement && elem.msFullscreenElement !== null);

    if (!isfullscren) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        /* Safari */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        /* IE11 */
        elem.msRequestFullscreen();
      }
    } else {
      if (elem.exitFullscreen) {
        elem.exitFullscreen();
      } else if (elem.webkitExitFullscreen) {
        elem.webkitExitFullscreen();
      } else if (elem.mozCancelFullScreen) {
        elem.mozCancelFullScreen();
      } else if (elem.msExitFullscreen) {
        elem.msExitFullscreen();
      }
    }
  }catch(e) {
    console.error(e);
  }
}



function touchable(whileTouched, options) {
  options = options || {}
  const el = new Element("a", {
    ...options,
    ontouchstart: ()=> {
      whileTouched();
      clearInterval(el.touchtimer);
      el.touchtimer = setInterval(()=> {
        whileTouched();
      }, 400)
    },
    ontouchend: ()=> clearInterval(el.touchtimer)
  })

  return el;
}
const getOffet = (div)=> {
  div = div.el || div;
  const item = div.getBoundingClientRect();
  item.right = item.width + item.x;
  item.bottom = item.y+ item.height;
  return item;
}

function getScrollableEl(div) {
  let el = div;
  for (let i = 0; i < 2; i++) {
    el = el.parentNode;
    if (el === undefined)
      return div;
    const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
    if (hasVerticalScrollbar)
      return el;
  }
  return div;
}

function scrollTo(el, parent) {
  try {
    el = typeof el === "string" ? document.querySelector(el): el;

    parent = parent || el.parentNode;
    const offset = el.offsetTop
    if (offset === undefined)
      return;
    parent.scrollTo(0, offset)
  }catch(e) {

    console.error("hhhh", e)
  }
}

const arrayItem = function() {
  const arr = function() {};
  arr.prototype = Array.prototype;


  arr.prototype.add = function(...items) {
    for (let item of items)
      this.push(item)
    return this;
  }

  arr.prototype.removeAt = function(index) {
    const item = [index]
    this.splice(index, 1);
    if (item.appendChild)
      item.remove();
    return this;
  }

  arr.prototype.remove = function(item) {
    const index = this.findIndex(x => x === item)
    return this.removeAt(item)
  }

  arr.prototype.clear = function () {
    while (this.length > 0) {
      let item = this.shift();
      if (item.appendChild)
        item.remove();
    }
    return this;
  }

  item = new arr();
  item.add.bind(item);
  item.remove.bind(item);
  item.clear.bind(item);
  item.removeAt.bind(item);
  return item;
}


const createdElements = new arrayItem();
const Element = function(type, options) {
  this.el = typeof type === "string" ?document.createElement(type): type;
  if (typeof type === "string")
    createdElements.add(this.el);
  if (options)
    Object.keys(options).forEach(x => {
    if (this.el.style[x] !== undefined)
      this.el.style[x] = options[x];
    else
      this.el[x] = options[x];
  });
  this.counter = 10
  this.val = (value)=> {
    const isv = ["input", "textarea"].indexOf(this.el.tagName.toLowerCase()) !==-1;
    if (value != undefined) {
      if (!isv)
        this.el.innerHTML = value;
      else this.el.value = value;
    }

    if (isv)
      return this.el.value;
    return this.el.innerHTML;
  }

  this.event = (name, func)=> {
    this.el.addEventListener(name, func);
    return this;
  }

  this.attr = (key, value)=> {
    if (value !== undefined)
      this.el.setAttribute(key, value);
    return this.el.getAttribute(key);
  }

  function getStyle(el, cssprop) {
    if (el.currentStyle) //IE
      return el.currentStyle[cssprop]
    else if (document.defaultView && document.defaultView.getComputedStyle) //Firefox
      return document.defaultView.getComputedStyle(el, "")[cssprop]
    else //try and get inline style
      return el.style[cssprop]
  }


  this.styleValue = (...items)=> {
    let item = {}
    items.forEach(k => {
      item[k] = getStyle(this.el, k)
    })

    return item;
  }

  this.css = (options)=> {
    Object.keys(options).forEach(x => {
      this.el.style[x] = options[x];
    });
    return this;
  }

  this.offset = ()=> {
    return getOffet(this.el);
  }

  this.getEl = (item)=> {
    return item.el || item
  }

  this.appendTo = (parent)=> {
    this.getEl(parent).appendChild(this.el);
    return this;
  }

  this.add = (content)=> {
    if (typeof content == "string") {
      const c = document.createElement("div");
      c.innerHTML = content;
      content = c;
    }

    if (content.el === undefined)
      this.el.appendChild(content);
    else this.el.appendChild(content.el);

    return this;
  }


  this.prepend = (content)=> {
    if (typeof content == "string") {
      const c = document.createElement("div");
      c.innerHTML = content;
      content = c;
    }

    if (content.el === undefined)
      this.el.prepend(content);
    else this.el.prepend(content.el);
  }

  this.insertAfter = (c)=> {
    c = c.el === undefined ? c: c.el;
    c.appendChild(this.el);
    c.parentNode.insertBefore(this.el, c.nextSibling);
    return this;
  }

  this.insertBefore = (c)=> {
    c = c.el === undefined ? c: c.el;
    c.appendChild(this.el);
    c.parentNode.insertBefore(this.el, c.previousSibling);
    return this;
  }

  this.center = (parent)=> {
    if (this.centerObject == undefined)
      this.centerObject = new center(this, parent);
    return this.centerObject;
  }

  this.classList = ()=> this.el.classList;

  this.slideDown = (center, offset, Onfinished)=> {
    const firstrun = offset == undefined;
    if (firstrun) {
      this.classList().remove("hidden");
      if (center)
        this.center().focus()
      offset = offset || this.offset();
      this.css({
        top: "-" + (offset.y + offset.height)+"px",
        opacity: 1
      });
    }
    const coffset = this.offset();
    setTimeout(()=> {
      if (coffset.y < offset.y) {
        this.css({
          top: (Math.min(coffset.y + this.counter, offset.y)) + "px"
        });
        this.slideDown(center, offset, Onfinished)
      } else if (Onfinished)
        Onfinished();
    },
      0);
  }

  this.slideUp = (y,
    onfinished)=> {
    const offset = this.offset();
    y = y || -(offset.y + offset.height)
    setTimeout(()=> {
      if (offset.y > y) {
        y += this.counter;
        this.css({
          top: (offset.y - this.counter) + "px"
        });
        this.slideUp(y, onfinished)
      } else {
        this.classList().add("hidden");
        if (onfinished)
          onfinished();

      }
    },
      0);
  }


  this.show = (ms,
    max,
    op)=> {
    ms = ms || 1;
    max = max || 1
    if (op === undefined) {
      this.css({
        opacity: 0
      });
      op = 0;
      this.classList().remove("hidden");
    }
    setTimeout(()=> {
      op += 0.01;
      if (op <= max) {
        this.css({
          opacity: op
        })
        this.show(ms, max, op)
      }
    },
      ms)
  }


  this.hide = (ms,
    op)=> {
    ms = ms || 1;
    op = op || parseFloat(this.styleValue("opacity").opacity)
    setTimeout(()=> {
      op -= 0.01;
      if (op >= 0) {
        this.css({
          opacity: op
        })
        this.hide(ms, op)
      } else this.classList().add("hidden")
    },
      ms)
  }


  this.find = (path)=> {
    return new Element(this.el.querySelector(path))
  }

  this.findAll = (path)=> {
    return [...this.el.querySelectorAll(path)].map(x => new Element(x));
  }
}

const resizEvents = new arrayItem();
const center = function(el, parent) {
  parent = parent || document.body;
  parent = parent.el || parent;
  el = el.el || el;
  resizEvents.add(()=> {
    setTimeout(()=> {
      this.focus();
    }, 300)

  })
  this.index = resizEvents.length -1;
  this.focus = ()=> {
    const pOffset = getOffet(parent);
    const eOffset = getOffet(el);
    el.style.left = ((pOffset.x + (pOffset.width/2)) - eOffset.width / 2) + "px";
    el.style.top = ((pOffset.y + (pOffset.height/2)) - (eOffset.height / 2)-30) + "px"

  }

  this.destroy = ()=> {
    resizEvents.removeAt(this.index);
  }

}

function SelectableButton(label, options, ...texts) {
  this.el = formField(label,
    {
      ...options,
      type: "button"
    });

  const btn = this.el.find("input");

  this.select = ()=> {
    btn.classList().add("selected");
    if (texts.length > 0)
      btn.val(texts[0]);

    return this;
  }

  this.toggle = ()=> {
    if (btn.classList().contains("selected"))
      this.deSelect();
    else this.select();

    return this;
  }

  this.deSelect = ()=> {
    btn.classList().remove("selected");
    if (texts.length > 1)
      btn.val(texts[1]);

    return this;
  }

  btn.event("click", ()=> {
    this.toggle();
  })
}

const wait = (ms)=> {
  return new Promise((r)=> setTimeout(r, ms))
}

let dialogsTotal = 1;
const dialog = function(parent, onchange) {
  dialogsTotal++;
  parent = parent || book.epubBody;
  const blur = document.createElement("div");
  blur.className = "blur hidden";
  blur.style.zIndex = dialogsTotal * 100;
  parent.appendChild(blur);

  const dialog = new Element("div",
    {
      zIndex: dialogsTotal * 101,
      className: "dialog hidden"
    }).appendTo(parent);
  this.dialog = dialog;
  this.centerData = undefined;
  dialog.center(parent);
  this.size = ()=> {
    if (this.centerData) {
      this.centerData.style.height = (dialog.offset().height-40) +"px"
    }
  }

  blur.onclick = ()=> {
    this.close()
  }

  resizEvents.add(()=> {
    this.size();
  })


  this.timer = undefined;
  this.open = ()=> {
    blur.classList.remove("hidden");
    dialog.slideDown(center,
      undefined,
      ()=> {
        this.size();
        if (onchange)
          onchange();

      });
    return this;
  }

  this.close = ()=> {
    dialog.slideUp(undefined,
      ()=> {
        blur.classList.add("hidden");
      });

    return this;
  }

  this.destroy = ()=> {
    dialog.remove();
    blur.remove();
    this.center.destroy();
    dialogsTotal--;
  }

  this.title = (text,
    buttons)=> {
    const tContainer = document.createElement("div");
    tContainer.className = "title";
    tContainer.innerHTML = text;
    dialog.prepend(tContainer);
    new Element("a",
      {
        innerHTML: "x",
        color: "red",
        onclick: ()=> {
          this.close()
        }
      }).appendTo(tContainer);
    return this;
  }

  this.data = (content)=> {
    if (this.centerData === undefined) {
      this.centerData = document.createElement("div");
      this.centerData.className = "center";
      dialog.add(this.centerData);
    }
    this.centerData.innerHTML = "";
    if (typeof content === "string") {
      this.centerData.innerHTML = content;
    } else this.centerData.appendChild(content);

    return this;
  }

}

const loader = function(parent) {
  parent = parent || new Element(document.body);
  this.isLoading = false;
  if (parent.el === undefined)
    parent = new Element(parent);

  const blur = new Element("div", {
    className: "blur hidden",
    zIndex: dialogsTotal * 100
  }).appendTo(parent.el);

  const loader = new Element("span", {
    className: "loader hidden",
    zIndex: dialogsTotal * 101
  }).appendTo(parent.el);


  this.show = ()=> {
    this.isLoading = true;
    dialogsTotal++;
    loader.css({
      zIndex: dialogsTotal * 101
    });
    blur.css({
      zIndex: dialogsTotal * 100
    });
    loader.classList().remove("hidden");
    blur.classList().remove("hidden");
    setTimeout(()=> {
      loader.center(parent).focus();
    }, 300)
    return this
  }

  this.hide = ()=> {
    this.isLoading = false;
    dialogsTotal--;
    loader.classList().add("hidden");
    blur.classList().add("hidden");
    return this;
  }
}
let book = undefined;
let menu = undefined;
const fonts = new arrayItem().add("Arial (sans-serif)", "Verdana (sans-serif)", "Tahoma (sans-serif)", "Trebuchet MS (sans-serif)", "Times New Roman (serif)", "Georgia (serif)", "Garamond (serif)", "Courier New (monospace)", "Brush Script MT (cursive)");

function bookSettings(b) {
  this.chapterSettings = new arrayItem();
  this.font = "Arial (sans-serif)";
  this.fontSize = 22;
  this.backgroundColor = "#ffffff";
  this.color = "#000";
  this.inlineStyle = "";
  this.name = b.name;
  this.selectedChapterIndex = 0;
  this.isBold = false;
  this.isFinished = false;
}

function chapterSetting(file) {
  Object.keys(file).forEach(x => {
    this[x] = file[x];
  });
  this.scrollProgress = 0;
  this.async = async(type)=> {
    return await file.async(type);
  }
}
// options {processHtml, enableLinks}
function Book(body, options, files, settings) {
  createdElements.clear();
  resizEvents.clear();
  this.epubBody = body;
  this.selectedChapter = undefined;
  this.name = files.name;
  this.files = files;
  this.options = options;
  this.settings = settings || new bookSettings(this);
  this.change = new arrayItem();
  this.loader = new loader();
  this.container = new Element("div", {
    id: "epubContainer",
    onscroll: (ev)=> {
      this.selectedChapter.scrollProgress = this.container.el.scrollTop;
      this.setProgress();
      this.bottomReached(ev.target);
      this.topReached();
    }
  }).appendTo(body);
  this.container.val("");
  this.iframe = new Element("iframe", {
    scrolling: "no"
  }).appendTo(this.container.el);

  this.downmenu = undefined;
  this.progress = new Element("svg-progress-circle", {
    className: "progress"
  }).appendTo(this.container)

  this.getHtmlFilesOrder = async()=> {
    try {
      const keys = Object.keys(this.files);
      const opf = keys.find(x => x.toLowerCase().indexOf(".opf") !== -1);
      const opfContent = await this.files[opf].async("text");
      let parser = new DOMParser();
      let htmlBody = parser.parseFromString(opfContent, 'text/html');
      let items = [...htmlBody.querySelectorAll("manifest item")].filter(x => x.getAttribute("href").indexOf(".html") !== -1 || x.getAttribute("href").indexOf(".css") !== -1).map(x => x.getAttribute("href"));

      if (items.length && !items.find(x => x.indexOf(".css") !== -1))
        items = [...items,
        ...keys.filter(x => x.indexOf(".css") !== -1)]
      return items
    }catch(e) {
      console.error("getHtmlFilesOrder", e);
    }
    return [];
  }

  this.getFont = ()=> {
    let f = this.settings.font;
    let name = f.substring(0, f.indexOf("("));
    let style = f.substring(f.indexOf("(")).replace(/\(|\)/g, "");
    return `${name},${style}`;
  }

  this.setProgress = ()=> {
    this.progress.el.percent = (100 * this.container.el.scrollTop) / (this.container.el.scrollHeight- this.container.el.clientHeight);
  }

  this.image = async (file, img)=> {
    const content = await file.async("arraybuffer");
    var buffer = new Uint8Array(content);
    var blob = new Blob([buffer.buffer]);
    img.src = URL.createObjectURL(blob);
  }

  this.load = async ()=> {
    this.loader.show();
    const htmlFiles = await this.getHtmlFilesOrder();
    const filesKeys = Object.keys(this.files);
    const keys = htmlFiles.length > 0 ? htmlFiles: filesKeys;
    try {
      for (let key of keys) {
        const k = filesKeys.find(x => x.toLowerCase().indexOf(key.toLowerCase()) !== -1);
        if (!k)
          continue
        const file = files[k];

        if (file === undefined || file.name === undefined)
          continue
        if (this.settings.inlineStyle.length <= 1 && file.name.indexOf(".css") !== -1) {
          this.settings.inlineStyle += "\n" + await file.async("text");
        } else if (this.isValid(file))
          this.settings.chapterSettings.add(new chapterSetting(file));
      }

      this.downmenu = new downMenu();
      menu = new topMenu();
      await this.loadChapter(this.settings.chapterSettings[0])
    }catch(e) {
      console.error(e)
    }
    this.loader.hide();
  }

  this.hasNext = ()=> {
    return this.settings.chapterSettings.length > this.settings.selectedChapterIndex +1;
  }

  this.hasPrev = ()=> {
    return this.settings.selectedChapterIndex > 0;
  }

  this.jumpTo = (index)=> {
    this.loadChapter(this.settings.chapterSettings[index])
  }

  this.next = ()=> {
    if (this.hasNext() && !this.loader.isLoading)
      this.jumpTo(this.settings.selectedChapterIndex +1);
  }

  this.prev = ()=> {
    if (this.hasPrev() && !this.loader.isLoading)
      this.jumpTo(this.settings.selectedChapterIndex -1);
  }


  this.cleanName = (name)=> {
    let n = name;
    if (n.indexOf("/") !== -1) {
      n = n.split("/");
      n = n[n.length-1]
    }
    n = n.replace("OEBPS/",
      "");
    if (n.indexOf(".html")!==-1)
      n = n.substring(n.indexOf(".html"), -1)
    return n;
  }

  this.isValid = (file)=> {
    if (file.name && file.name.toLowerCase().indexOf(".html")!==-1 && file.name.toLowerCase().indexOf("toc.html") == -1) {
      return file
    }
    return undefined
  }

  this.write = async (html) => {
    const ifrm = this.iframe.el;
    const doc = ifrm.contentWindow ? ifrm.contentWindow.document: ifrm.contentDocument;
    await doc.open();
    await doc.write(html);
    await doc.close();
  }

  function invertColor(hex) {
    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
      throw new Error('Invalid HEX color.');
    }
    // invert color components
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
    g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
    b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return '#' + padZero(r) + padZero(g) + padZero(b);
  }

  function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
  }
  let timer;
  let timer0;
  this.bottomReached = (obj)=> {
    clearTimeout(timer)
    if (!this.loader.isLoading)
      timer = setTimeout(()=> {
      if (!this.loader.isLoading && obj.scrollTop > (obj.scrollHeight - obj.offsetHeight - 20)) {
        this.selectedChapter.isFinished = true;
        this.next();
      }
    },
      200)
  }

  this.topReached = ()=> {
    clearTimeout(timer0)
    if (!this.loader.isLoading)
      timer0 = setTimeout(()=> {
      if (!this.loader.isLoading && this.container.el.scrollTop <= 10 && this.settings.selectedChapterIndex > 0) {
        this.prev();
      }
    },
      200);
  }

  this.loadChapter = async (chapter)=> {
    try {
      this.loader.show();
      chapter = chapter || this.selectedChapter;
      this.settings.selectedChapterIndex = this.settings.chapterSettings.findIndex(x => x.name === chapter.name);
      this.selectedChapter = chapter;
      const text = await chapter.async("text");
      this.iframe.css({
        height: "auto"
      })
      await this.write("");
      const ifrm = this.iframe.el;
      const doc = ifrm.contentWindow ? ifrm.contentWindow.document: ifrm.contentDocument;
      let parser = new DOMParser();
      let htmlBody = parser.parseFromString(text,
        'text/html').querySelector("body");
      htmlBody = htmlBody ? htmlBody.innerHTML: text;
      const style = `
      p,*{
      line-height:${this.settings.fontSize *1.7}px;
      font-size:${this.settings.fontSize}px;
      font-family:${this.getFont()};
      background:${this.settings.backgroundColor};
      color:${invertColor(this.settings.backgroundColor)};
      font-weight:${this.settings.isBold ? "bold": "normal"};
      }
      `
      htmlBody = `
      <style> parameter{display:none;}
      img{max-width:100%;}
      ${this.settings.inlineStyle}
      ${style}
      </style>` + htmlBody;
      document.body.style.backgroundColor = this.settings.backgroundColor;


      [...document.querySelectorAll(".menuIcon div")].forEach(x => x.style.backgroundColor = invertColor(this.settings.backgroundColor));

      await this.write(htmlBody);
      var body = doc.body,
      html = doc.documentElement;
      if (!this.options.enableLinks) {
        [...body.querySelectorAll("a")].forEach(x => x.onclick = ()=> {
          return false
        })
      }
      var height = Math.max(body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight,
        this.container.offset().height);
      this.iframe.css({
        height: height + "px",
        paddingTop: this.settings.selectedChapterIndex === 0 ? 0: 200,
        paddingBottom: 200

      })
      doc.body.onclick = ()=> this.downmenu.toggle();
      for (let m of [...doc.querySelectorAll("img")]) {
        let src = m.src.split("/");
        src = src[src.length-1].toLowerCase()
        let f = Object.keys(this.files).find(x => this.files[x].name.toLowerCase().indexOf(src.toLowerCase()) !== -1);
        if (f)
          await this.image(this.files[f], m)
      }

      this.change.forEach(x => x());
      menu.loadChapters(chapter);
      if (chapter.scrollProgress <= 0)
        chapter.scrollProgress = this.settings.selectedChapterIndex > 0 ? 200: 0;
      if (chapter.isFinished && chapter.scrollProgress > 200)
        chapter.scrollProgress -= 200;
      this.container.el.scrollTop = chapter.scrollProgress;
      this.setProgress();
    }catch(e) {
      console.error(e);
    }finally {
      this.loader.hide();
    }
  }

}

function formField(label, options, ...dataList) {
  const doc = new Element("div", {
    className: "formContainer"
  });
  const lb = new Element("label", {
    innerHTML: label
  }).appendTo(doc);
  const input = new Element(dataList && dataList.length > 0 ? "select": "input", {
    type: "text",
    ...options
  }).appendTo(doc);
  if (options && options.type === "range") {
    const output = options.handler || new Element("label", {
      className: "bubble",
      innerHTML: input.val()
    }).appendTo(doc);
    input.event("input", ()=> {
      const range = input.el;
      const bubble = output.el;

      const min = range.min ? range.min: 0;
      const max = range.max ? range.max: 100;
      const val = range.value || max;
      const newVal = Number(((val - min) * 100) / (max - min));
      bubble.innerHTML = val;
    })
  }


  if (dataList && dataList.length > 0) {
    dataList.forEach(x => input.add(new Element("option", {
      value: x, innerHTML: x
    })));
  }

  return doc;
}


function horizentalMenu(onchange) {
  this.selectedIndex = -1;
  this.tabs = [];
  this.container = new Element("div", {
    className: "tab-menu"
  });
  this.tabsContainer = new Element("div", {
    className: "tab-container"
  }).appendTo(this.container.el);
  this.content = new Element("div", {
    className: "content"
  }).appendTo(this.container.el);


  this.addTabs = (...tabs)=> {
    tabs.forEach((x, i)=> {
      this.tabs.add(x);
      const a = new Element("a", {
        innerHTML: x.text,
        onclick: ()=> {
          this.select(i);
        }
      }).appendTo(this.tabsContainer.el)
    });

    if (this.selectedIndex ===-1)
      this.select(0);
    return this;
  }

  this.resize = ()=> {
    setTimeout(()=> {
      const parent = this.content.el.parentNode;
      if (parent) {
        this.content.css({
          "max-height": (getOffet(parent).height -40)+ "px"
        })
      }
    },
      100)
  }

  resizEvents.add(()=> {
    this.resize()
  })

  this.select = (index)=> {
    this.resize();
    if (this.selectedIndex == index)
      return
    this.selectedIndex = index;
    this.content.classList().add("hidden")
    this.content.val("");
    this.content.add(this.tabs[index].content.el);
    this.content.show(10);
    this.tabsContainer.findAll("a").forEach((x, i) => {
      if (i == index)
        x.classList().add("selected");
      else x.classList().remove("selected")
    });

    if (onchange)
      onchange();
  }
}

function downMenu() {
  this.container = new Element("div", {
    className: "DownMenu hidden"
  }).appendTo(book.epubBody);

  const top = new Element("div").appendTo(this.container)

  this.elContainer = new Element("div", {}).appendTo(this.container)
  let timer = undefined;
  const prev = touchable(()=> book.prev(), {
    className: "link",
    innerHTML: "&laquo;"
  }).appendTo(this.elContainer.el);

  const range = new Element("input", {
    type: "range",
    min: 0,
    max: book.settings.chapterSettings.length-1,
    value: book.settings.selectedChapterIndex,
    step: 1,
    onchange: ()=> {
      clearTimeout(timer);

      timer = setTimeout(()=> {
        book.jumpTo(parseInt(range.val()));
      }, 500)
    }
  }).event("input", ()=> {
    procent.val((parseInt(range.val())+1)+"/" + book.settings.chapterSettings.length)
  }).appendTo(this.elContainer);

  const next = touchable(()=> book.next(),
    {
      className: "link",
      innerHTML: "&raquo;",
    }).appendTo(this.elContainer);

  const procent = new Element("p",
    {
      className: "procent",
      innerHTML: book.settings.selectedChapterIndex+1 +"/" + book.settings.chapterSettings.length
    }).appendTo(top);

  const title = new Element("div").appendTo(this.container).add(new Element("p", {})).find("p")

  book.change.add(()=> {
    range.val(book.settings.selectedChapterIndex);
    procent.val(book.settings.selectedChapterIndex+1 +"/" + book.settings.chapterSettings.length)
    title.val(book.cleanName(book.selectedChapter.name))
  })

  this.toggle = ()=> {
    if (this.container.classList().contains("hidden"))
      this.container.show(0.8);
    else this.container.hide();
  }
}

function topMenu() {
  const reg = /(\.)| |\//g;
  this.firstLoad = true;
  this.container = new Element("div",
    {
      className: "topMenu"
    });
  this.button = new Element("i",
    {
      className: "topButton menuIcon",
      innerHTML: "<div></div><div></div><div></div>",
      onclick: ()=> this.dialog.open()
    }).insertBefore(book.container);
  this.validateScroll = ()=> {
    setTimeout(()=> {
      if (book === undefined || book.selectedChapter === undefined)
        return;
      const el = document.querySelector("."+ book.selectedChapter.name.replace(reg, ""))
      if (el && el.parentNode && el.parentNode.parentNode)
        scrollTo(el, el.parentNode.parentNode);
    },
      10);
  }
  const tabs = [{
    text: "FONTS",
    content: new Element("div").add(new formField("Font-Size", {
      type: "range",
      min: 12,
      max: 35,
      step: 1,
      value: book.settings.fontSize,
      onchange: ()=> {
        book.settings.fontSize = parseInt(tabs[0].content.find("input").val());
        book.loadChapter();
      }
    })).add(new formField("Font", {
      list: "font-f",
      value: book.settings.font,
      onchange: (e)=> {
        book.settings.font = e.target.value;
        book.loadChapter();
      }
    }, ...fonts))
    .add(new formField("Color", {
      type: "color",
      value: book.settings.backgroundColor,
      onchange: (e)=> {
        book.settings.backgroundColor = e.target.value;
        book.loadChapter();
      }
    }))
    .add(new SelectableButton("FontWeight", {
      onclick: (e)=> {
        book.settings.isBold = !book.settings.isBold;
        book.loadChapter();
      },
      className: "link"
    }, "Bold", "Normal").deSelect().el).add(new SelectableButton("Fullscreen", {
      type: "button",
      className: "link",
      value: "Enter Fullscreen",
      onclick: ()=> {
        openFullscreen();
      }
    }, "Exit FullScreen", "Enter FullScreen").deSelect().el)

  }, {
    text: "CHAPTERS",
    content: new Element("div",
      {
        className: "chapters"
      })
  },
    {
      text: "INLINE STYLE",
      content: new Element("textarea",
        {
          rows: 20,
          cols: 33,
          onchange: ()=> {
            if (book) {
              book.settings.inlineStyle = tabs[2].content.val();
              book.loadChapter();
            }
          }
        })
    }]

  this.tabMenu = new horizentalMenu(()=> this.validateScroll()).addTabs(...tabs);
  this.dialog = new dialog(book.epubBody,
    ()=> {
      this.tabMenu.select(0);
      this.validateScroll();
    }).title("SETTINGS").data(this.tabMenu.container.el)


  this.loadChapters = (ch)=> {
    if (book) {
      if (this.firstLoad) {
        tabs[2].content.val(book.settings.inlineStyle);
        this.firstLoad = false;
      }
      const ctab = tabs[1].content;
      ctab.val("")
      book.settings.chapterSettings.forEach(x => {
        let chapter = x
        if (book.isValid(x))
          ctab.add(new Element("a", {
          innerHTML: book.cleanName(x.name),
          className: (
            ch.name === x.name ?" selected ": "") + x.name.replace(reg, ""),
          onclick: ()=> {
            book.loadChapter(chapter)
          }
        }).el);
      });
    }
  }
}
let externalContainer = undefined;
async function fetch_file(url, options) {
  try {
    const data = await fetch(url);
    const buffer = await data.arrayBuffer();
    const content = await JSZip.loadAsync(buffer);
    book = new Book(externalContainer,
      options,
      content.files);
    await book.load();
  }catch(e) {
    console.error(e);
    throw e;
  }
}
async function downloadFile (file, options) {
  try {
    const data = await JSZip.loadAsync(file);
    data.files.name = file.name;
    book = new Book(externalContainer,
      options,
      data.files);
    await book.load();
  }catch(e) {
    console.error(e);
    throw e;
  }
}

const ReadFile = async (urlOrFile, options)=> {
  externalContainer = options.container;
  if (typeof urlOrFile === "string")
    await fetch_file(urlOrFile, options);
  else await downloadFile(urlOrFile, options);
  return book;
}

window.onresize = ()=> resizEvents.forEach(x => x());