/**
 * 模拟select
 * @example : $('#a').combo({width: 100,callback: {onChange: function(){alert('ok')}}})
 */
(function(t) {
	t.fn.combo = function(e) {
		if (this.length == 0) {
			return this
		}
		var i, s = arguments;
		this.each(function() {
			var a = t(this).data("_combo");
			if (typeof e == "string") {
				if (!a) {
					return
				}
				if (typeof a[e] === "function") {
					s = Array.prototype.slice.call(s, 1);
					i = a[e].apply(a, s)
				}
			} else {
				if (!a) {
					a = new t.Combo(t(this), e);
					t(this).data("_combo", a)
				}
			}
		});
		return i === undefined ? this : i
	};
	t.fn.getCombo = function() {
		return t.Combo.getCombo(this)
	};
	t.Combo = function(e, i) {
		this.obj = e;
		this.opts = t.extend(true, {}, t.Combo.defaults, i);
		this.dataOpt = this.opts.data;
		this._selectedIndex = -1;
		this._disabled = typeof this.opts.disabled != "undefined" ? !!this.opts.disabled : !!this.obj.attr("disabled");
		t.extend(this, this.opts.callback);
		this._init()
	};
	t.Combo.getCombo = function(e) {
		e = t(e);
		if (e.length == 0) {
			return
		} else if (e.length == 1) {
			return e.data("_combo")
		} else if (e.length > 1) {
			var i = [];
			e.each(function(e) {
				i.push(t(this).data("_combo"))
			});
			return i
		}
	};
	t.Combo.prototype = {
		constructor: t.Combo,
		_init: function() {
			var t = this.opts;
			if (this.obj[0].tagName.toLowerCase() == "select") {
				this.originSelect = this.obj;
				this.dataOpt = this._getDataFromSelect()
			}
			this._createCombo();
			this.loadData(this.dataOpt, t.defaultSelected, t.defaultFlag);
			this._handleDisabled(this._disabled);
			this._bindEvent()
		},
		loadData: function(t, e, i) {
			if (this.xhr) {
				this.xhr.abort()
			}
			this.empty(false);
			this.dataOpt = t;
			this.mode = this._getRenderMode();
			if (!this.mode) {
				return
			}
			if (this.mode == "local") {
				this._formatData();
				this._populateList(this.formattedData);
				this._setDefaultSelected(e, i)
			} else if (this.mode == "remote") {
				this._loadAjaxData(e, i)
			}
		},
		activate: function() {
			if (!this.focus) {
				this.input.focus()
			}
			this.wrap.addClass(this.opts.activeCls);
			this.active = true
		},
		_blur: function() {
			if (!this.active) {
				return
			}
			this.collapse();
			if (this.opts.editable && this.opts.forceSelection) {
				this.selectByText(this.input.val());
				if (this._selectedIndex == -1) {
					this.input.val("")
				}
			}
			this.wrap.removeClass(this.opts.activeCls);
			this.active = false;
			if (typeof this.onBlur == "function") {
				this.onBlur()
			}
		},
		blur: function() {
			if (this.focus) {
				this.input.blur()
			}
			this._blur()
		},
		_bindEvent: function() {
			var e = this,
				i = this.opts,
				s = "." + i.listItemCls;
			e.list.on("click", s, function(s) {
				if (!t(this).hasClass(i.selectedCls)) {
					e.selectByItem(t(this))
				}
				e.collapse();
				e.input.focus();
				if (typeof e.onListClick == "function") {
					e.onListClick()
				}
			}).on("mouseover", s, function(e) {
				t(this).addClass(i.hoverCls).siblings().removeClass(i.hoverCls)
			}).on("mouseleave", s, function(e) {
				t(this).removeClass(i.hoverCls)
			});
			e.input.on("focus", function(t) {
				e.wrap.addClass(i.activeCls);
				e.focus = true;
				e.active = true
			}).on("blur", function(t) {
				e.focus = false
			});
			if (!i.editable) {
				e.input.on("click", function(t) {
					e._onTriggerClick()
				})
			} else {
				e.input.on("click", function(t) {
					this.select()
				})
			}
			if (e.trigger) {
				e.trigger.on("click", function(t) {
					e._onTriggerClick()
				})
			}
			t(document).on("click", function(i) {
				var s = i.target || i.srcElement;
				if (t(s).closest(e.wrap).length == 0 && t(s).closest(e.listWrap).length == 0) {
					e.blur()
				}
			});
			this.listWrap.on("click", function(t) {
				t.stopPropagation()
			});
			t(window).on("resize", function() {
				e._setListPosition()
			});
			this._bindKeyEvent()
		},
		_bindKeyEvent: function() {
			var e = this,
				i = this.opts;
			var s = {
				backSpace: 8,
				esc: 27,
				f7: 118,
				up: 38,
				down: 40,
				tab: 9,
				enter: 13,
				home: 36,
				end: 35,
				pageUp: 33,
				pageDown: 34,
				space: 32
			};
			var a;
			this.input.on("keydown", function(t) {
				switch (t.keyCode) {
					case s.tab:
						e._blur();
						break;
					case s.down:
					case s.up:
						if (!e.isExpanded) {
							e._onTriggerClick()
						} else {
							var a = t.keyCode == s.down ? "next" : "prev";
							e._setItemFocus(a)
						}
						t.preventDefault();
						break;
					case s.enter:
						if (e.isExpanded) {
							var l = e.list.find("." + i.hoverCls);
							if (l.length > 0) {
								e.selectByItem(l)
							}
							e.collapse()
						}
						break;
					case s.home:
					case s.end:
						if (e.isExpanded) {
							var l = t.keyCode == s.home ? e.list.find("." + i.listItemCls).eq(0) : e.list.find("." + i.listItemCls).filter(":last");
							e._scrollToItem(l);
							t.preventDefault()
						}
						break;
					case s.pageUp:
					case s.pageDown:
						if (e.isExpanded) {
							var a = t.keyCode == s.pageUp ? "up" : "down";
							e._scrollPage(a);
							t.preventDefault()
						}
						break
				}
			}).on("keyup", function(t) {
				if (!i.editable) {
					return
				}
				var a = t.which;
				var l = a == 8 || a == 9 || a == 13 || a == 27 || a >= 16 && a <= 20 || a >= 33 && a <= 40 || a >= 44 && a <= 46 || a >= 112 && a <= 123 || a == 144 || a == 145;
				var n = e.input.val();
				if (!l || a == s.backSpace) {
					e.doDelayQuery(n)
				}
			});
			t(document).on("keydown", function(t) {
				if (t.keyCode == s.esc) {
					e.collapse()
				}
			})
		},
		distory: function() {},
		enable: function() {
			this._handleDisabled(false)
		},
		disable: function(t) {
			t = typeof t == "undefined" ? true : !!t;
			this._handleDisabled(t)
		},
		_handleDisabled: function(t) {
			var e = this.opts;
			this._disabled = t;
			t == true ? this.wrap.addClass(e.disabledCls) : this.wrap.removeClass(e.disabledCls);
			this.input.attr("disabled", t)
		},
		_createCombo: function() {
			var e = this.opts,
				i = parseInt(this.opts.width),
				s, a, l, n;
			if (this.originSelect) {
				this.originSelect.hide()
			}
			if (this.obj[0].tagName.toLowerCase() == "input") {
				this.input = this.obj
			} else {
				a = this.obj.find("." + e.inputCls);
				this.input = a.length > 0 ? a : t('<input type="text" class="' + e.inputCls + '"/>')
			}
			this.input.attr({
				autocomplete: "off",
				readOnly: !e.editable
			}).css({
				cursor: !e.editable ? "default" : ""
			});
			l = t(this.obj).find("." + e.triggerCls);
			if (l.length > 0) {
				this.trigger = l
			} else if (e.trigger !== false) {
				this.trigger = t('<span class="' + e.triggerCls + '"></span>')
			}
			if (this.obj.hasClass(e.wrapCls)) {
				s = this.obj
			} else {
				s = this.obj.find("." + e.wrapCls)
			}
			if (s.length > 0) {
				this.wrap = s.append(this.input, this.trigger)
			} else if (this.trigger) {
				this.wrap = t('<span class="' + e.wrapCls + '"></span>').append(this.input, this.trigger);
				if (this.originSelect && this.obj[0] == this.originSelect[0] || this.obj[0] == this.input[0]) {
					if (this.obj.next().length > 0) {
						this.wrap.insertBefore(this.obj.next())
					} else {
						this.wrap.appendTo(this.obj.parent())
					}
				} else {
					this.wrap.appendTo(this.obj)
				}
			}
			if (this.wrap && e.id) {
				this.wrap.attr("id", e.id)
			}
			if (!this.wrap) {
				this.wrap = this.input
			}
			this._setComboLayout(i);
			this.list = t("<div />").addClass(e.listCls).css({
				position: "relative",
				overflow: "auto"
			});
			this.listWrap = t("<div />").addClass(e.listWrapCls).attr("id", e.listId).hide().append(this.list).css({
				position: "absolute",
				top: 0,
				zIndex: e.zIndex
			});
			if (e.extraListHtml) {
				t("<div />").addClass(e.extraListHtmlCls).append(e.extraListHtml).appendTo(this.listWrap)
			}
			if (e.listRenderToBody) {
				if (!t.Combo.allListWrap) {
					t.Combo.allListWrap = t('<div id="COMBO_WRAP"/>').appendTo("body")
				}
				this.listWrap.appendTo(t.Combo.allListWrap)
			} else {
				this.wrap.after(this.listWrap)
			}
		},
		_setListLayout: function() {
			var t = this.opts,
				e, i = parseInt(t.listHeight),
				s = 0,
				a, l = this.trigger ? this.trigger.outerWidth() : 0,
				n = parseInt(t.minListWidth),
				r = parseInt(t.maxListWidth);
			this.listWrap.width("auto");
			this.list.height("auto");
			this.listWrap.show();
			this.isExpanded = true;
			a = this.list.height();
			if (!isNaN(i) && i >= 0) {
				i = Math.min(i, a);
				this.list.height(i)
			}
			if (t.listWidth == "auto" || t.width == "auto") {
				e = this.listWrap.outerWidth();
				if (a < this.list.height()) {
					s = 20;
					e += s
				}
			} else {
				e = parseInt(t.listWidth);
				isNaN(e) ? e = this.wrap.outerWidth() : null
			}
			if (t.width == "auto") {
				var o = this.listWrap.outerWidth() + Math.max(l, s);
				this._setComboLayout(o)
			}
			n = isNaN(n) ? this.wrap.outerWidth() : Math.max(n, this.wrap.outerWidth());
			if (!isNaN(n) && e < n) {
				e = n
			}
			if (!isNaN(r) && e > r) {
				e = r
			}
			e = e - (this.listWrap.outerWidth() - this.listWrap.width());
			//modified s
			//this.listWrap.width(e);
			this.listWrap.css('min-width', e+2);
			//modified e
			this.listWrap.hide();
			this.isExpanded = false
		},
		_setComboLayout: function(t) {
			if (!t) {
				return
			}
			var e = this.opts,
				i = parseInt(e.maxWidth),
				s = parseInt(e.minWidth);
			if (!isNaN(i) && t > i) {
				t = i
			}
			if (!isNaN(s) && t < s) {
				t = s
			}
			var a;
			t = t - (this.wrap.outerWidth() - this.wrap.width());
			this.wrap.width(t);
			if (this.wrap[0] == this.input[0]) {
				return
			}
			a = t - (this.trigger ? this.trigger.outerWidth() : 0) - (this.input.outerWidth() - this.input.width());
			this.input.width(a)
		},
		_setListPosition: function() {
			if (!this.isExpanded) {
				return
			}
			var e = this.opts,
				i, s, a = t(window),
				l = this.wrap.offset().top,
				n = this.wrap.offset().left,
				r = a.height(),
				o = a.width(),
				h = a.scrollTop(),
				d = a.scrollLeft(),
				u = this.wrap.outerHeight(),
				f = this.wrap.outerWidth(),
				c = this.listWrap.outerHeight(),
				p = this.listWrap.outerWidth(),
				m = parseInt(this.listWrap.css("border-top-width"));
			i = l - h + u + c > r && l > c ? l - c + m : l + u - m;
			s = n - d + p > o ? n + f - p : n;
			this.listWrap.css({
				top: i,
				left: s
			})
		},
		_getRenderMode: function() {
			var e, i = this.dataOpt;
			if (t.isFunction(i)) {
				i = i()
			}
			if (t.isArray(i)) {
				this.rawData = i;
				e = "local"
			} else if (typeof i == "string") {
				this.url = i;
				e = "remote"
			}
			return e
		},
		_loadAjaxData: function(e, i, s) {
			var a = this,
				l = a.opts,
				n = l.ajaxOptions,
				r = t("<div />").addClass(l.loadingCls).text(n.loadingText);
			a.list.append(r);
			a.list.find(l.listTipsCls).remove();
			a._setListLayout();
			a._setListPosition();
			a.xhr = t.ajax({
				url: a.url,
				type: n.type,
				dataType: n.dataType,
				timeout: n.timeout,
				success: function(l) {
					r.remove();
					if (t.isFunction(n.success)) {
						n.success(l)
					}
					if (t.isFunction(n.formatData)) {
						l = n.formatData(l)
					}
					if (!l) {
						return
					}
					a.rawData = l;
					a._formatData();
					a._populateList(a.formattedData);
					if (e === "") {
						a.lastQuery = s;
						a.filterData = a.formattedData;
						a.expand()
					} else {
						a._setDefaultSelected(e, i)
					}
					a.xhr = null
				},
				error: function(e, i, s) {
					r.remove();
					t("<div />").addClass(l.tipsCls).text(n.errorText).appendTo(a.list);
					a.xhr = null
				}
			})
		},
		getDisabled: function() {
			return this._disabled
		},
		getValue: function() {
			if (this._selectedIndex > -1) {
				return this.formattedData[this._selectedIndex].value
			} else {
				if (this.opts.forceSelection) {
					return ""
				} else {
					return this.input.val()
				}
			}
		},
		getText: function() {
			if (this._selectedIndex > -1) {
				return this.formattedData[this._selectedIndex].text
			} else {
				if (this.opts.forceSelection) {
					return ""
				} else {
					return this.input.val()
				}
			}
		},
		getSelectedIndex: function() {
			return this._selectedIndex
		},
		getSelectedRow: function() {
			if (this._selectedIndex > -1) {
				return this.rawData[this._selectedIndex]
			}
		},
		getDataRow: function() {
			if (this._selectedIndex > -1) {
				return this.rawData[this._selectedIndex]
			}
		},
		getAllData: function() {
			return this.formattedData
		},
		getAllRawData: function() {
			return this.rawData
		},
		_setDefaultSelected: function(e, i) {
			var s = this.opts;
			if (typeof e == "function") {
				defaultSelected = defaultSelected.call(this, this.rawData)
			}
			if (!isNaN(parseInt(e))) {
				var a = parseInt(e);
				this._setSelected(a, i)
			} else if (t.isArray(e)) {
				this.selectByKey(e[0], e[1], i)
			} else if (this.originSelect) {
				var a = this.originSelect[0].selectedIndex;
				this._setSelected(a, i)
			} else if (s.autoSelect) {
				this._setSelected(0, i)
			}
		},
		selectByIndex: function(t, e) {
			this._setSelected(t, e)
		},
		selectByText: function(t, e) {
			if (!this.formattedData) {
				return
			}
			var i = this.formattedData,
				s = -1;
			for (var a = 0, l = i.length; a < l; a++) {
				if (i[a].text === t) {
					s = a;
					break
				}
			}
			this._setSelected(s, e)
		},
		selectByValue: function(t, e) {
			if (!this.formattedData) {
				return
			}
			var i = this.formattedData,
				s = -1;
			for (var a = 0, l = i.length; a < l; a++) {
				if (i[a].value === t) {
					s = a;
					break
				}
			}
			this._setSelected(s, e)
		},
		selectByKey: function(t, e, i) {
			if (!this.rawData) {
				return
			}
			var s = this.rawData,
				a, l = -1;
			for (var n = 0, r = s.length; n < r; n++) {
				if (s[n][t] === e) {
					l = n;
					break
				}
			}
			this._setSelected(l, i)
		},
		selectByItem: function(t, e) {
			if (!t || t.parent()[0] != this.list[0]) {
				return
			}
			var i = t.text();
			this.selectByText(i, e)
		},
		_setSelected: function(t, e) {
			var i = this.opts,
				t = parseInt(t);
			var e = typeof e != "undefined" ? !!e : true;
			if (isNaN(t)) {
				return
			}
			if (!this.formattedData || this.formattedData.length == 0) {
				this._selectedIndex = -1;
				return
			}
			var s = this.formattedData.length;
			if (t < -1 || t >= s) {
				t = -1
			}
			if (this._selectedIndex == t) {
				return
			}
			var a = t == -1 ? null : this.formattedData[t];
			var l = t == -1 ? null : a.rawData;
			var n = t == -1 ? "" : a.text;
			var r = this.list.find("." + i.listItemCls);
			if (e && typeof this.beforeChange == "function") {
				if (!this.beforeChange(l)) {
					return
				}
			}
			if (t != -1) {}
			if (!(i.editable && t == -1 && this.focus)) {
				this.input.val(n)
			}
			this._selectedIndex = t;
			if (e && typeof this.onChange == "function") {
				this.onChange(l)
			}
			if (this.originSelect) {
				this.originSelect[0].selectedIndex = t
			}
		},
		removeSelected: function(t) {
			this.input.val("");
			this._setSelected(-1, t)
		},
		_triggerCallback: function(t, e) {},
		_getDataFromSelect: function() {
			var e = this.opts,
				i = [];
			t.each(this.originSelect.find("option"), function(s) {
				var a = t(this),
					l = {};
				l[e.text] = a.text();
				l[e.value] = a.attr("value");
				i.push(l)
			});
			return i
		},
		_formatData: function() {
			if (!t.isArray(this.rawData)) {
				return
			}
			var e = this,
				i = e.opts;
			e.formattedData = [];
			//根据业务新增
			if (i.emptyOptions) {
				e.formattedData.push({
					text: "(空)",
					value: 0
				})
			}
			if (i.addOptions) {
				e.formattedData.push(i.addOptions)
			}
			t.each(this.rawData, function(s, a) {
				var l = {},
					n, r;
				l.text = t.isFunction(i.formatText) ? i.formatText(a) : a[i.text];
				l.value = t.isFunction(i.formatValue) ? i.formatValue(a) : a[i.value];
				l.rawData = a;
				e.formattedData.push(l)
			})
		},
		_filter: function(e) {
			e = typeof e == "undefined" ? "" : e;
			if (this.input.val() != this.getText()) {
				this.selectByText(this.input.val())
			}
			var i = this.opts,
				s = this,
				a = i.maxFilter;
			if (!this.opts.cache) {
				if (this.mode == "local" && t.isFunction(this.dataOpt)) {
					this.rawData = this.dataOpt()
				}
				this._formatData()
			}
			if (!t.isArray(this.formattedData)) {
				return
			}
			if (e == "") {
				this.filterData = this.formattedData
			} else {
				this.filterData = [];
				t.each(s.formattedData, function(a, l) {
					var n = l.text;
					if (t.isFunction(i.customMatch)) {
						if (!i.customMatch(n, e)) {
							return
						}
					} else {
						var r = i.caseSensitive ? "" : "i";
						var o = new RegExp(e.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), r);
						if (n.search(o) == -1) {
							return
						}
					}
					s.filterData.push(l);
					if (s.filterData.length == i.maxFilter) {
						return false
					}
				})
			}
			this.lastQuery = e;
			this.list.empty();
			this._populateList(this.filterData);
			this.expand()
		},
		doDelayQuery: function(t) {
			var e = this,
				i = e.opts,
				s = parseInt(i.queryDelay);
			if (isNaN(s)) {
				s = 0
			}
			if (e.queryDelay) {
				window.clearTimeout(e.queryDelay)
			}
			e.queryDelay = window.setTimeout(function() {
				e.doQuery(t)
			}, s)
		},
		doQuery: function(t) {
			if (this.mode == "local" || this.mode == "remote" && this.opts.loadOnce) {
				this._filter(t)
			} else {
				this._loadAjaxData("", false, t)
			}
		},
		_populateList: function(e) {
			if (!e) {
				return
			}
			var i = this,
				s = i.opts;
			if (e.length == 0) {
				if (s.forceSelection) {
					t("<div />").addClass(s.tipsCls).html(s.noDataText).appendTo(i.list);
					this._setListLayout()
				}
			} else {
				for (var a = 0, l = e.length; a < l; a++) {
					var n = e[a],
						r = n.text,
						o = n.value;
					t("<div />").attr({
						"class": s.listItemCls + (a == this._selectedIndex ? " " + s.selectedCls : ""),
						"data-value": o
					}).text(r).appendTo(i.list)
				}
				this._setListLayout()
			}
		},
		expand: function() {
			var e = this.opts;
			if (!this.active || this.isExpanded || this.filterData.length == 0 && !e.noDataText && !e.extraListHtmlCls) {
				this.listWrap.hide();
				return
			}
			this.isExpanded = true;
			this.listWrap.show();
			this._setListPosition();
			if (t.isFunction(this.onExpand)) {
				this.onExpand()
			}
			var i = this.list.find("." + e.listItemCls);
			if (i.length == 0) {
				return
			}
			var s = i.filter("." + e.selectedCls);
			if (s.length == 0) {
				s = i.eq(0).addClass(e.hoverCls)
			}
			this._scrollToItem(s)
		},
		collapse: function() {
			if (!this.isExpanded) {
				return
			}
			var e = this.opts;
			this.listWrap.hide();
			this.isExpanded = false;
			if (this.listItems) {
				this.listItems.removeClass(e.hoverCls)
			}
			if (t.isFunction(this.onCollapse)) {
				this.onCollapse()
			}
		},
		_onTriggerClick: function() {
			if (this._disabled) {
				return
			}
			this.active = true;
			this.input.focus();
			if (this.isExpanded) {
				this.collapse()
			} else {
				this._filter()
			}
		},
		_scrollToItem: function(t) {
			if (!t || t.length == 0) {
				return
			}
			var e = this.list.scrollTop();
			var i = e + t.position().top;
			var s = e + this.list.height();
			var a = i + t.outerHeight();
			if (i < e || a > s) {
				this.list.scrollTop(i)
			}
		},
		_scrollPage: function(t) {
			var e = this.list.scrollTop();
			var i = this.list.height();
			var s;
			if (t == "up") {
				s = e - i
			} else if (t == "down") {
				s = e + i
			}
			this.list.scrollTop(s)
		},
		_setItemFocus: function(t) {
			var e = this.opts,
				i, s, a = this.list.find("." + e.listItemCls);
			if (a.length == 0) {
				return
			}
			var l = a.filter("." + e.hoverCls).eq(0);
			if (l.length == 0) {
				l = a.filter("." + e.selectedCls).eq(0)
			}
			if (l.length == 0) {
				i = 0
			} else {
				i = a.index(l);
				if (t == "next") {
					i = i == a.length - 1 ? 0 : i + 1
				} else {
					i = i == 0 ? a.length - 1 : i - 1
				}
			}
			s = a.eq(i);
			a.removeClass(e.hoverCls);
			s.addClass(e.hoverCls);
			this._scrollToItem(s)
		},
		empty: function(t) {
			this._setSelected(-1, false);
			this.input.val("");
			this.list.empty();
			this.rawData = null;
			this.formattedData = null
		},
		setEdit: function() {}
	};
	t.Combo.defaults = {
		data: null,
		text: "text",
		value: "value",
		formatText: null,
		formatValue: null,
		defaultSelected: undefined,
		//defaultFlag: true, //初始化时是否启用回调函数
		defaultFlag: false,
		autoSelect: true,
		disabled: undefined,
		editable: false,
		caseSensitive: false,
		forceSelection: true,
		//cache: true,
		cache: false,
		queryDelay: 100,
		maxFilter: 10,
		minChars: 0,
		customMatch: null,
		noDataText: "没有匹配的选项",
		width: undefined,
		minWidth: undefined,
		maxWidth: undefined,
		listWidth: undefined,
		listHeight: 150,
		maxListWidth: undefined,
		maxListWidth: undefined,
		zIndex: 9e3,
		listRenderToBody: true,
		extraListHtml: undefined,
		ajaxOptions: {
			type: "get",
			dataType: "json",
			queryParam: "query",
			timeout: 1e4,
			formatData: null,
			loadingText: "Loading...",
			success: null,
			error: null,
			errorText: "数据加载失败"
		},
		loadOnce: true,
		id: undefined,
		listId: undefined,
		wrapCls: "ui-combo-wrap",
		focusCls: "ui-combo-focus",
		disabledCls: "ui-combo-disabled",
		activeCls: "ui-combo-active",
		inputCls: "input-txt",
		triggerCls: "trigger",
		listWrapCls: "ui-droplist-wrap",
		listCls: "droplist",
		listItemCls: "list-item",
		selectedCls: "selected",
		hoverCls: "on",
		loadingCls: "loading",
		tipsCls: "tips",
		extraListHtmlCls: "extra-list-ctn",
		callback: {
			onFocus: null,
			onBlur: null,
			beforeChange: null,
			onChange: null,
			onExpand: null,
			onCollapse: null
		}
	}
})(jQuery);