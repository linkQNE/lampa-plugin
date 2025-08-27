(function () {
    'use strict';

    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    function CustomFavoriteFolder(data) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        this.data = data;
        this.params = params;
        this.card = this.data.length ? this.data[0] : {};

        this.create = function () {
            var self = this;

            this.folder = Lampa.Template.js('bookmarks_folder');
            this.folder.querySelector('.bookmarks-folder__title').innerText = Lampa.Lang.translate('menu_' + params.media);
            this.folder.querySelector('.bookmarks-folder__num').innerText = this.data.length;
            this.folder.addEventListener('hover:focus', function () {
                if (self.onFocus) {
                    self.onFocus(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:touch', function () {
                if (self.onTouch) {
                    self.onTouch(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:hover', function () {
                if (self.onHover) {
                    self.onHover(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: params.title + ' - ' + Lampa.Lang.translate('menu_' + params.media),
                    component: 'favorite',
                    type: params.category,
                    filter: params.media,
                    page: 1
                });
            });
            this.folder.addEventListener('visible', this.visible.bind(this));
        };

        this.image = function (src, i) {
            var self = this;

            var img = document.createElement('img');
            img.addClass('card__img');
            img.addClass('i-' + i);

            img.onload = function () {
                self.folder.classList.add('card--loaded');
            };

            img.onerror = function () {
                img.src = './img/img_broken.svg';
            };

            this.folder.querySelector('.bookmarks-folder__body').append(img);
            img.src = src;
        };

        this.visible = function () {
            var self = this;

            var filtred = this.data.filter(function (a) {
                return a.poster_path;
            }).slice(0, 3);
            filtred.forEach(function (a, i) {
                self.image(Lampa.Api.img(a.poster_path), i);
            });
            if (filtred.length == 0) {
                this.image('./img/img_load.svg');
            }
            if (this.onVisible) {
                this.onVisible(this.folder, data);
            }
        };

        this.destroy = function () {
            this.folder.remove();
        };

        this.render = function (js) {
            return js ? this.folder : $(this.folder);
        };
    }

    function CustomFavorite() {
        var allCustomFavs = [];

        this.getFavorite = function () {
            var favorite = Lampa.Storage.get('favorite', {});
            favorite.card = favorite.card || [];

            var customTypes = favorite.customTypes || {};
            favorite.customTypes = customTypes;

            allCustomFavs = this.getCards(favorite);

            return favorite;
        }

        this.getTypes = function () {
            return Object.keys(this.getFavorite().customTypes);
        }

        // ADDED: Нова функція для отримання назв закладок для конкретної картки
        this.getTypesForCard = function (card) {
            var favorite = this.getFavorite();
            var cardId = card.id;
            var types = [];
            
            for (var typeName in favorite.customTypes) {
                if (favorite.customTypes.hasOwnProperty(typeName)) {
                    var uid = favorite.customTypes[typeName];
                    if (favorite[uid] && favorite[uid].indexOf(cardId) !== -1) {
                        types.push(typeName);
                    }
                }
            }
            return types;
        };

        this.getCards = function (favorite) {
            if (!favorite && allCustomFavs.length > 0) {
                return allCustomFavs;
            }

            favorite = favorite || this.getFavorite();
            allCustomFavs = Object.keys(favorite.customTypes).reduce(function (acc, key) {
                var uid = favorite.customTypes[key];
                return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
            }, []);

            return allCustomFavs;
        }

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

            return {
                name: typeName,
                uid: uid,
                counter: 0
            };
        }

        this.renameType = function (oldName, newName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[oldName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            if (favorite.customTypes[newName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            favorite.customTypes[newName] = uid;
            delete favorite.customTypes[oldName];

            Lampa.Storage.set('favorite', favorite);
            Lampa.Favorite.init();

            return true;
        }

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
        }

        this.getTypeList = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            return favorite[uid] || [];
        }

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
                if (favorite.card.every(function (favCard) { return favCard.id !== card.id })) {
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

            return {
                name: typeName,
                uid: uid,
                counter: typeList.length,
            }
        }
    }

    var customFavorite = new CustomFavorite();

    function FavoritePageService() {}

    FavoritePageService.prototype.renderCustomFavoriteButton = function (type) {
        var customTypeCssClass = 'custom-type-' + type.uid;

        var $register = Lampa.Template.js('register').addClass('selector').addClass(customTypeCssClass).addClass('custom-type');
        $register.find('.register__name').text(type.name).addClass(customTypeCssClass);
        $register.find('.register__counter').text(type.counter || 0).addClass(customTypeCssClass);

        var $render = Lampa.Activity.active().activity.render();

        $register.on('hover:long', function () {
            var menu = [{
                title: Lampa.Lang.translate('rename'),
                action: 'rename'
            }, {
                title: Lampa.Lang.translate('settings_remove'),
                action: 'remove'
            }]

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
                        case 'remove':
                            {
                                try {
                                    customFavorite.removeType(type.name);
                                    $register.remove();

                                    Lampa.Controller.toggle(controllerName);
                                    Lampa.Controller.toggle('content');
                                } finally {
                                    break;
                                }
                            }
                        case 'rename':
                            {
                                var inputOptions = {
                                    title: Lampa.Lang.translate('filter_set_name'),
                                    value: type.name,
                                    free: true,
                                    nosave: true
                                };

                                Lampa.Input.edit(inputOptions, function (value) {
                                    if (value === '' || type.name == value) {
                                        Lampa.Controller.toggle('content');
                                        return;
                                    };

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
                page: 1,
            });
        });

        $('.register:first', $render).after($register);
        return $register;
    }

    FavoritePageService.prototype.refresh = function (type) {
        var activity = Lampa.Activity.active();

        if (activity.component === 'bookmarks') {
            $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
        };
    }

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
                };

                try {
                    var type = customFavorite.createType(value);
                    self.renderCustomFavoriteButton(type);
                } finally {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    FavoritePageService.prototype.renderLines = function () {
        var object = Lampa.Activity.active();
        var favorite = customFavorite.getFavorite();
        var mediaTypes = ['movies', 'tv'];
        var lines = [];

        Object.keys(favorite.customTypes).reverse().forEach(function (typeName) {
            var typeUid = favorite.customTypes[typeName];
            var typeList = favorite[typeUid] || [];

            var typeCards = favorite.card.filter(function (card) {
                return typeList.indexOf(card.id) !== -1
            });
            var lineItems = Lampa.Arrays.clone(typeCards.slice(0, 20));

            var i = 0;
            mediaTypes.forEach(function (m) {
                var filter = Lampa.Utils.filterCardsByType(typeCards, m);

                if (filter.length) {
                    Lampa.Arrays.insert(lineItems, i, {
                        cardClass: function cardClass() {
                            return new CustomFavoriteFolder(filter, {
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
            lineItems.forEach(function (item) {
                item.ready = false;
            });

            if (lineItems.length > 0) {
                object.activity.component().append({
                    title: typeName,
                    results: lineItems,
                    type: typeUid
                });
            }
        });
    }

    var favoritePageSvc = new FavoritePageService();

    function CardFavoriteService() {
        this.extendContextMenu = function (object) {
            var self = this;

            var bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
                return $(this).text() === Lampa.Lang.translate('title_book');
            });

            customFavorite.getTypes().forEach(function (customCategory) {
                var $menuItem = $('<div class="selectbox-item selector"><div class="selectbox-item__title">' + customCategory + '</div><div class="selectbox-item__checkbox"></div></div>');
                $menuItem.insertBefore(bookmarkMenuItem.parent());
                $menuItem.on('hover:enter', function () {
                    var category = $(this).find('.selectbox-item__title').text();
                    var type = customFavorite.toggleCard(category, object.data);
                    $(this).toggleClass('selectbox-item--checked');

                    setTimeout(function () {
                        if (object.card) {
                            // CHANGED: Викликаємо нову функцію
                            self.updateFavoriteLabel(object);
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

            Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));

            setTimeout(function () {
                var $menuItems = $('body > .selectbox').find('.selector');
                if ($menuItems.length > 0) {
                    Lampa.Controller.focus($menuItems.get(0));
                    Navigator.focus($menuItems.get(0));
                }
            }, 10);
        };

        // REWRITTEN: Функцію повністю переписано для відображення назви закладки
        this.updateFavoriteLabel = function (object) {
            var card_body = $(object.card).find('.card__body');
            if (!card_body.length) card_body = $(object.card);
            
            // Спочатку видаляємо попередню мітку, якщо вона є
            card_body.find('.card__custom-fav-label').remove();
            
            // Отримуємо список закладок для цієї картки
            var folderNames = customFavorite.getTypesForCard(object.data);
            
            // Якщо картка є в якійсь закладці
            if (folderNames.length > 0) {
                // Беремо назву першої закладки
                var folderName = folderNames[0];
                // Створюємо елемент мітки з шаблону
                var label = Lampa.Template.js('custom-fav-label');
                // Встановлюємо текст
                label.text(folderName);
                // Додаємо мітку на картку
                card_body.append(label);
            }
        }

        this.refreshBookmarkIcon = function () {
            var active = Lampa.Activity.active();

            if (active.component !== 'full') {
                return;
            }

            var card = active.card;
            var anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;

            var favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
            var anyFavorite = anyCustomFavorite || Object.keys(favStates).filter(function (favType) {
                return favType !== 'history' && favType !== 'any';
            }).some(function (favType) {
                return !!favStates[favType];
            });

            var $svg = $(".button--book svg path", active.activity.render());

            if (anyFavorite) {
                $svg.attr('fill', 'currentColor');
            } else {
                $svg.attr('fill', 'transparent');
            };
        }
    }

    var cardFavoriteSvc = new CardFavoriteService();

    function start() {
        if (window.custom_favorites) {
            return;
        }

        window.custom_favorites = true;

        Lampa.Utils.putScript(['https://levende.github.io/lampa-plugins/listener-extensions.js'], function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type !== 'build') {
                    return;
                }

                var originalFavorite = event.object.favorite;
                event.object.favorite = function () {
                    originalFavorite.apply(this, arguments);
                    // CHANGED: Викликаємо нову функцію для оновлення мітки
                    cardFavoriteSvc.updateFavoriteLabel(event.object);
                }

                var originalOnMenu = event.object.onMenu;
                event.object.onMenu = function () {
                    originalOnMenu.apply(this, arguments);
                    cardFavoriteSvc.extendContextMenu(event.object);
                }
            });
        });

        Lampa.Favorite.listener.follow('remove', (function () {
            var eventQueue = [];
            var isProcessing = false;

            function processEvents() {
                if (eventQueue.length === 0 || isProcessing) {
                    return;
                }

                isProcessing = true;

                var favorite = customFavorite.getFavorite();
                var cardsToAdd = [];
                var i, event;

                for (i = 0; i < eventQueue.length; i++) {
                    event = eventQueue[i];
                    if (event.method === 'card' && !event.typeId && customFavorite.getCards().indexOf(event.card.id) >= 0) {
                        cardsToAdd.push(event.card);
                    }
                }

                if (cardsToAdd.length > 0) {
                    for (i = 0; i < cardsToAdd.length; i++) {
                        favorite.card.push(cardsToAdd[i]);
                    }
                    Lampa.Storage.set('favorite', favorite);
                }

                eventQueue = [];

                var hasNonCardEvent = false;
                for (i = 0; i < eventQueue.length; i++) {
                    if (eventQueue[i].method !== 'card') {
                        hasNonCardEvent = true;
                        break;
                    }
                }
                if (hasNonCardEvent) {
                    setTimeout(cardFavoriteSvc.refreshBookmarkIcon, 0);
                }

                isProcessing = false;

                if (eventQueue.length > 0) {
                    setTimeout(processEvents, 0);
                }
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
        
        // CHANGED: Замінюємо шаблон іконки-зірочки на шаблон для текстової мітки
        Lampa.Template.add('custom-fav-label', '<div class="card__custom-fav-label"></div>');

        // CHANGED: Оновлюємо та додаємо стилі для нової мітки
        $('<style>').prop('type', 'text/css').html(
            '.card__body { position: relative; overflow: hidden; } ' +
            '.card__custom-fav-label {' +
                'position: absolute;' +
                'top: 0.5em;' +
                'right: 0.5em;' +
                'background-color: rgba(206, 44, 44, 0.9);' + // напівпрозорий червоний
                'color: white;' +
                'padding: 0.2em 0.6em;' +
                'border-radius: 0.4em;' +
                'font-size: 1.1em;' +
                'font-weight: 500;' +
                'z-index: 2;' +
                'max-width: 80%;' +
                'white-space: nowrap;' +
                'overflow: hidden;' +
                'text-overflow: ellipsis;' +
            '}' +
            '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
            '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }' +
            '.register.custom-type { background-image: url("https://levende.github.io/lampa-plugins/assets/tap.svg"); background-repeat: no-repeat; background-position: 90% 90%; background-size: 20%; }'
        ).appendTo('head');

        Lampa.Listener.follow('full', function (event) {
            if (event.type == 'complite') {
                var active = Lampa.Activity.active();
                cardFavoriteSvc.refreshBookmarkIcon();

                var $btnBook = $(".button--book", active.activity.render());
                $btnBook.on('hover:enter', function () {
                    cardFavoriteSvc.extendContextMenu({
                        data: active.card
                    });
                });
            }
        });

        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name !== 'activity') {
                return;
            }

            if (Lampa.Activity.active().component === 'bookmarks') {
                if ($('.new-custom-type').length !== 0) {
                    return;
                }

                favoritePageSvc.renderAddButton();
                var favorite = customFavorite.getFavorite();

                favoritePageSvc.renderLines();

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
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();
