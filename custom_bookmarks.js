(function () {
    'use strict';

    function debounce(func, wait) {
        var t;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { func.apply(ctx, args); }, wait);
        };
    }

    function filterCardsByMedia(cards, media) {
        var want = media === 'movies' ? 'movie' : 'tv';
        return (cards || []).filter(function (c) {
            var m = c.media_type || c.type || (c.name ? 'tv' : 'movie');
            return m === want;
        });
    }

    function CustomFavoriteFolder(data, params) {
        params = params || {};
        this.data = data || [];
        this.params = params;
        this.card = this.data.length ? this.data[0] : {};
        this.$folder = null;

        this.create = function () {
            var self = this;
            this.$folder = Lampa.Template.js('bookmarks_folder'); // jQuery object

            this.$folder.find('.bookmarks-folder__title')
                .text(Lampa.Lang.translate('menu_' + params.media));
            this.$folder.find('.bookmarks-folder__num')
                .text(String(this.data.length || 0));

            this.$folder.on('hover:focus', function () {
                if (self.onFocus) self.onFocus(self.$folder[0], self.card);
            });
            this.$folder.on('hover:touch', function () {
                if (self.onTouch) self.onTouch(self.$folder[0], self.card);
            });
            this.$folder.on('hover:hover', function () {
                if (self.onHover) self.onHover(self.$folder[0], self.card);
            });
            this.$folder.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: params.title + ' - ' + Lampa.Lang.translate('menu_' + params.media),
                    component: 'favorite',
                    type: params.category,
                    filter: params.media,
                    page: 1
                });
            });
            this.$folder.on('visible', this.visible.bind(this));
        };

        this.image = function (src, i) {
            var self = this;
            var $img = $('<img class="card__img' + (typeof i !== 'undefined' ? ' i-' + i : '') + '">');

            $img.on('load', function () {
                self.$folder.addClass('card--loaded');
            });
            $img.on('error', function () {
                $img.attr('src', './img/img_broken.svg');
            });

            this.$folder.find('.bookmarks-folder__body').append($img);
            $img.attr('src', src);
        };

        this.visible = function () {
            var self = this;
            var filtred = (this.data || []).filter(function (a) { return a.poster_path; }).slice(0, 3);

            filtred.forEach(function (a, i) {
                self.image(Lampa.Api.img(a.poster_path), i);
            });

            if (filtred.length === 0) {
                this.image('./img/img_load.svg');
            }

            if (this.onVisible) {
                this.onVisible(this.$folder[0], this.data);
            }
        };

        this.destroy = function () {
            if (this.$folder) this.$folder.remove();
        };

        this.render = function (js) {
            return js ? this.$folder[0] : this.$folder;
        };
    }

    function CustomFavorite() {
        var allCustomFavs = [];

        this.getFavorite = function () {
            var favorite = Lampa.Storage.get('favorite', {});
            favorite.card = favorite.card || [];
            favorite.customTypes = favorite.customTypes || {};
            allCustomFavs = this.getCards(favorite);
            return favorite;
        };

        this.getTypes = function () {
            return Object.keys(this.getFavorite().customTypes);
        };

        this.getCards = function (favorite) {
            if (!favorite && allCustomFavs.length > 0) return allCustomFavs;

            favorite = favorite || this.getFavorite();
            allCustomFavs = Object.keys(favorite.customTypes).reduce(function (acc, key) {
                var uid = favorite.customTypes[key];
                return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
            }, []);

            return allCustomFavs;
        };

        this.createType = function (typeName) {
            var favorite = this.getFavorite();
            if (favorite.customTypes[typeName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }
            var uid = Lampa.Utils.uid(8).toLowerCase();
            favorite.customTypes[typeName] = uid;
            favorite[uid] = [];
            Lampa.Storage.set('favorite', favorite);
            Lampa.Favorite.init();
            return { name: typeName, uid: uid, counter: 0 };
        };

        this.renameType = function (oldName, newName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[oldName];
            if (!uid) {
                var err1 = new Error('custom.fav.not-defined');
                err1.code = 'custom.fav';
                throw err1;
            }
            if (favorite.customTypes[newName]) {
                var err2 = new Error('custom.fav.name-used');
                err2.code = 'custom.fav';
                throw err2;
            }
            favorite.customTypes[newName] = uid;
            delete favorite.customTypes[oldName];
            Lampa.Storage.set('favorite', favorite);
            Lampa.Favorite.init();
            return true;
        };

        this.removeType = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];
            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }
            delete favorite.customTypes[typeName];
            delete favorite[uid];
            Lampa.Storage.set('favorite', favorite);
            Lampa.Favorite.init();
            return true;
        };

        this.getTypeList = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];
            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }
            return favorite[uid] || [];
        };

        this.toggleCard = function (typeName, card) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];
            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            var typeList = favorite[uid] || [];
            favorite[uid] = typeList;

            if (typeList.indexOf(card.id) === -1) {
                if (favorite.card.every(function (favCard) { return favCard.id !== card.id; })) {
                    Lampa.Arrays.insert(favorite.card, 0, card);
                }
                Lampa.Arrays.insert(typeList, 0, card.id);
                this.getCards(favorite);

                Lampa.Favorite.listener.send('add', {
                    card: card,
                    where: typeName,
                    typeId: uid
                });
            } else {
                Lampa.Arrays.remove(typeList, card.id);
                var customCards = this.getCards(favorite);

                Lampa.Favorite.listener.send('remove', {
                    card: card,
                    method: 'id',
                    where: typeName,
                    typeId: uid
                });

                var used = customCards.indexOf(card.id) >= 0 || Lampa.Favorite.check(card).any;

                if (!used) {
                    favorite.card = favorite.card.filter(function (favCard) {
                        return favCard.id !== card.id;
                    });

                    Lampa.Favorite.listener.send('remove', {
                        card: card,
                        method: 'card',
                        where: typeName,
                        typeId: uid
                    });
                }
            }

            Lampa.Storage.set('favorite', favorite);
            Lampa.Favorite.init();

            return { name: typeName, uid: uid, counter: typeList.length };
        };
    }

    var customFavorite = new CustomFavorite();

    function FavoritePageService() {}

    FavoritePageService.prototype.renderCustomFavoriteButton = function (type) {
        var customTypeCssClass = 'custom-type-' + type.uid;

        var $register = Lampa.Template.js('register')
            .addClass('selector')
            .addClass(customTypeCssClass)
            .addClass('custom-type');

        $register.find('.register__name')
            .text(type.name)
            .addClass(customTypeCssClass);

        $register.find('.register__counter')
            .text(type.counter || 0)
            .addClass(customTypeCssClass);

        var $render = Lampa.Activity.active().activity.render();

        $register.on('hover:long', function () {
            var menu = [
                { title: Lampa.Lang.translate('rename'), action: 'rename' },
                { title: Lampa.Lang.translate('settings_remove'), action: 'remove' }
            ];

            var controllerName = Lampa.Controller.enabled().name;

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu,
                onBack: function () {
                    Lampa.Controller.toggle(controllerName);
                    Lampa.Controller.toggle('content');
                },
                onSelect: function (item) {
                    switch (item.action) {
                        case 'remove': {
                            try {
                                customFavorite.removeType(type.name);
                                $register.remove();
                                Lampa.Controller.toggle(controllerName);
                                Lampa.Controller.toggle('content');
                            } finally {}
                            break;
                        }
                        case 'rename': {
                            var inputOptions = {
                                title: Lampa.Lang.translate('filter_set_name'),
                                value: type.name,
                                free: true,
                                nosave: true
                            };

                            Lampa.Input.edit(inputOptions, function (value) {
                                if (value === '' || type.name === value) {
                                    Lampa.Controller.toggle('content');
                                    return;
                                }
                                try {
                                    customFavorite.renameType(type.name, value);
                                    $register.find('.register__name').text(value);
                                    type.name = value;
                                } finally {
                                    Lampa.Controller.toggle(controllerName);
                                    Lampa.Controller.collectionFocus($register, $render);
                                }
                            });
                            break;
                        }
                    }
                }
            });
        });

        $register.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                component: 'favorite',
                title: type.name,
                type: type.uid,
                page: 1
            });
        });

        $('.register:first', $render).after($register);
        return $register;
    };

    FavoritePageService.prototype.refresh = function (type) {
        var activity = Lampa.Activity.active();
        if (activity.component === 'bookmarks') {
            $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
        }
    };

    FavoritePageService.prototype.renderAddButton = function () {
        var self = this;
        var $register = Lampa.Template.js('register').addClass('selector').addClass('new-custom-type');
        $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');

        $('.register:first').before($register);

        $register.on('hover:enter', function () {
            var inputOptions = {
                title: Lampa.Lang.translate('filter_set_name'),
                value: '',
                free: true,
                nosave: true
            };

            Lampa.Input.edit(inputOptions, function (value) {
                if (value === '') {
                    Lampa.Controller.toggle('content');
                    return;
                }
                try {
                    var type = customFavorite.createType(value);
                    self.renderCustomFavoriteButton(type);
                } finally {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    };

    FavoritePageService.prototype.renderLines = function () {
        var object = Lampa.Activity.active();
        var favorite = customFavorite.getFavorite();
        var mediaTypes = ['movies', 'tv'];

        Object.keys(favorite.customTypes).reverse().forEach(function (typeName) {
            var typeUid = favorite.customTypes[typeName];
            var typeList = favorite[typeUid] || [];

            var typeCards = favorite.card.filter(function (card) {
                return typeList.indexOf(card.id) !== -1;
            });

            var lineItems = Lampa.Arrays.clone(typeCards.slice(0, 20));

            var i = 0;
            mediaTypes.forEach(function (m) {
                var filtered = filterCardsByMedia(typeCards, m);
                if (filtered.length) {
                    Lampa.Arrays.insert(lineItems, i, {
                        cardClass: function cardClass() {
                            return new CustomFavoriteFolder(filtered, {
                                title: typeName,
                                category: typeUid,
                                media: m
                            });
                        }
                    });
                    i++;
                }
            });

            lineItems = lineItems.slice(0, 20);
            lineItems.forEach(function (item) { item.ready = false; });

            if (lineItems.length > 0) {
                object.activity.component().append({
                    title: typeName,
                    results: lineItems,
                    type: typeUid
                });
            }
        });
    };

    var favoritePageSvc = new FavoritePageService();

    function CardFavoriteService() {
        this.extendContextMenu = function (object) {
            var self = this;

            var $selectbox = $('body > .selectbox');
            var $titles = $selectbox.find('.selectbox-item__title');

            var bookmarkMenuItem = $titles.filter(function () {
                return $(this).text() === Lampa.Lang.translate('title_book');
            });

            customFavorite.getTypes().forEach(function (customCategory) {
                var $menuItem = $('<div class="selectbox-item selector"><div class="selectbox-item__title">'
                    + customCategory + '</div><div class="selectbox-item__checkbox"></div></div>');

                $menuItem.insertBefore(bookmarkMenuItem.parent());

                $menuItem.on('hover:enter', function () {
                    var category = $(this).find('.selectbox-item__title').text();
                    var type = customFavorite.toggleCard(category, object.data);
                    $(this).toggleClass('selectbox-item--checked');

                    setTimeout(function () {
                        if (object.card) {
                            self.refreshCustomFavoriteIcon(object);
                        } else {
                            self.refreshBookmarkIcon();
                        }
                    }, 0);

                    favoritePageSvc.refresh(type);
                });

                if (customFavorite.getTypeList(customCategory).indexOf(object.data.id) >= 0) {
                    $menuItem.addClass('selectbox-item--checked');
                }
            });

            Lampa.Controller.collectionSet($selectbox.find('.scroll__body'));

            setTimeout(function () {
                var $menuItems = $selectbox.find('.selector');
                if ($menuItems.length > 0) {
                    Lampa.Controller.focus($menuItems.get(0));
                }
            }, 10);
        };

        this.refreshCustomFavoriteIcon = function (object) {
            var customFavCards = customFavorite.getCards();
            var $iconHolder = $('.card__icons-inner', object.card);
            var id = object.data.id;
            var anyFavorite = customFavCards.indexOf(id) >= 0;

            var $starIcon = $('.icon--star', $iconHolder);
            var hasIcon = $starIcon.length !== 0;
            var hasHiddenIcon = hasIcon && $starIcon.hasClass('hide');

            if (anyFavorite) {
                if (!hasIcon) {
                    $iconHolder.prepend(Lampa.Template.get('custom-fav-icon'));
                } else if (hasHiddenIcon) {
                    $starIcon.removeClass('hide');
                }
            } else {
                if (hasIcon && !hasHiddenIcon) {
                    $starIcon.addClass('hide');
                }
            }
        };

        this.refreshBookmarkIcon = function () {
            var active = Lampa.Activity.active();
            if (active.component !== 'full') return;
            var card = active.card;

            var anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;

            var favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
            var anyFavorite = anyCustomFavorite || Object.keys(favStates)
                .filter(function (favType) { return favType !== 'history' && favType !== 'any'; })
                .some(function (favType) { return !!favStates[favType]; });

            var $svg = $(".button--book svg path", active.activity.render());
            $svg.attr('fill', anyFavorite ? 'currentColor' : 'transparent');
        };
    }

    var cardFavoriteSvc = new CardFavoriteService();

    function start() {
        if (window.custom_favorites) return;
        window.custom_favorites = true;

        function renderBookmarkBadges(card_object) {
            var all_types = customFavorite.getTypes();
            all_types.forEach(function (type_name) {
                var ids_in_type = customFavorite.getTypeList(type_name);
                var movie = card_object.movie || card_object.data || {};
                if (movie && ids_in_type.indexOf(movie.id) !== -1) {
                    var badge = '<div class="card-bookmark-badge">' + type_name + '</div>';
                    card_object.display.find('.card__view').append(badge);
                }
            });
        }

        // Load the same extension the working example uses
        Lampa.Utils.putScript(['https://levende.github.io/lampa-plugins/listener-extensions.js'], function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type !== 'build') return;

                var originalFavorite = event.object.favorite;
                event.object.favorite = function () {
                    originalFavorite.apply(this, arguments);
                    cardFavoriteSvc.refreshCustomFavoriteIcon(event.object);
                };

                var originalOnMenu = event.object.onMenu;
                event.object.onMenu = function () {
                    originalOnMenu.apply(this, arguments);
                    cardFavoriteSvc.extendContextMenu(event.object);
                };

                try {
                    renderBookmarkBadges(event.object);
                } catch (e) {}
            });
        });

        // Fix remove-queue logic
        Lampa.Favorite.listener.follow('remove', (function () {
            var eventQueue = [];
            var isProcessing = false;

            function processEvents() {
                if (eventQueue.length === 0 || isProcessing) return;
                isProcessing = true;

                var favorite = customFavorite.getFavorite();
                var snapshot = eventQueue.slice(0);
                eventQueue = [];

                var cardsToAdd = [];
                for (var i = 0; i < snapshot.length; i++) {
                    var ev = snapshot[i];
                    if (ev.method === 'card' && !ev.typeId && customFavorite.getCards().indexOf(ev.card.id) >= 0) {
                        cardsToAdd.push(ev.card);
                    }
                }

                if (cardsToAdd.length > 0) {
                    for (var j = 0; j < cardsToAdd.length; j++) {
                        favorite.card.push(cardsToAdd[j]);
                    }
                    Lampa.Storage.set('favorite', favorite);
                }

                var hasNonCardEvent = snapshot.some(function (ev) { return ev.method !== 'card'; });
                if (hasNonCardEvent) {
                    setTimeout(cardFavoriteSvc.refreshBookmarkIcon, 0);
                }

                isProcessing = false;
                if (eventQueue.length > 0) setTimeout(processEvents, 0);
            }

            var debounceProcess = debounce(processEvents, 100);

            return function (event) {
                eventQueue.push(event);
                debounceProcess();
            };
        })());

        Lampa.Lang.add({
            rename: {
                en: 'Rename',
                uk: 'Змінити ім’я',
                ru: 'Изменить имя'
            }
        });

        Lampa.Template.add('custom-fav-icon', '<div class="card__icon icon--star"><svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg></div>');

        $('<style>').prop('type', 'text/css').html(
            '.card-bookmark-badge { position: absolute; bottom: 10px; left: 10px; background-color: rgba(255, 165, 0, 0.85); color: white; padding: 3px 8px; border-radius: 5px; font-size: 12px; font-weight: bold; z-index: 2; }' +
            '.card__icon { position: relative; } ' +
            '.icon--star svg { position: absolute; height: 60%; width: 60%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
            '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
            '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }' +
            '.register.custom-type { background-image: url("https://levende.github.io/lampa-plugins/assets/tap.svg"); background-repeat: no-repeat; background-position: 90% 90%; background-size: 20%; }'
        ).appendTo('head');

        // Build bookmarks page when activated
        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name !== 'activity') return;

            if (Lampa.Activity.active().component === 'bookmarks') {
                if ($('.new-custom-type').length === 0) {
                    favoritePageSvc.renderAddButton();
                }

                favoritePageSvc.renderLines();

                var favorite = customFavorite.getFavorite();
                Object.keys(favorite.customTypes).reverse().forEach(function (typeName) {
                    var typeUid = favorite.customTypes[typeName];
                    var typeList = favorite[typeUid] || [];
                    var typeCounter = typeList.length;

                    favoritePageSvc.renderCustomFavoriteButton({
                        name: typeName,
                        uid: typeUid,
                        counter: typeCounter
                    });
                });

                Lampa.Activity.active().activity.toggle();
            }
        });

        // Update icons on full screen
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                var active = Lampa.Activity.active();
                cardFavoriteSvc.refreshBookmarkIcon();

                var $btnBook = $(".button--book", active.activity.render());
                $btnBook.off('hover:enter.customfav').on('hover:enter.customfav', function () {
                    cardFavoriteSvc.extendContextMenu({ data: active.card });
                });
            }
        });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    }
})();
