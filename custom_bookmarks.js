(function () {
    'use
    strict ';

    function CustomBookmarksPlugin() {
        var self = this;
        this.bookmarks = {};

        // Завантаження закладок при запуску
        this.create = function () {
            this.loadBookmarks();
            this.addBookmarkButton();
        };

        // Завантаження закладок з локального сховища
        this.loadBookmarks = function () {
            self.bookmarks = Lampa.Storage.get('custom_bookmarks', {});
        };

        // Збереження закладок
        this.saveBookmarks = function () {
            Lampa.Storage.set('custom_bookmarks', self.bookmarks);
        };

        // Додавання кнопки для управління закладками
        this.addBookmarkButton = function () {
            var btn = $('<div class="head__action"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--octicon" width="2em" height="2em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 16 16"><path fill="currentColor" d="M3 3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-2.5A1.5 1.5 0 0 1 2.5 0h11A1.5 1.5 0 0 1 15 1.5v13A1.5 1.5 0 0 1 13.5 16h-11A1.5 1.5 0 0 1 1 14.5v-13zM2.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-11z"></path></svg></div>');
            btn.on('click', function () {
                self.showBookmarksMenu();
            });
            $('.head .head__right').append(btn);
        };

        // Меню для управління закладками
        this.showBookmarksMenu = function () {
            var items = [];
            for (var name in self.bookmarks) {
                items.push({
                    title: name,
                    name: name
                });
            }
            items.push({
                title: 'Створити нову закладку',
                create: true
            });

            Lampa.Select.show({
                title: 'Мої закладки',
                items: items,
                onSelect: function (a) {
                    if (a.create) {
                        self.createBookmark();
                    } else {
                        self.showBookmarkContent(a.name);
                    }
                    Lampa.Select.close();
                },
                onBack: function () {
                    Lampa.Select.close();
                }
            });
        };

        // Створення нової закладки
        this.createBookmark = function () {
            Lampa.Input.edit({
                title: 'Нова закладка',
                value: '',
                free: true,
                nosave: true
            }, function (value) {
                if (value) {
                    self.bookmarks[value] = [];
                    self.saveBookmarks();
                    Lampa.Noty.show('Закладка "' + value + '" створена');
                }
                Lampa.Input.close();
            });
        };

        // Відображення вмісту закладки
        this.showBookmarkContent = function (name) {
            Lampa.Activity.push({
                url: '',
                title: 'Закладка: ' + name,
                component: 'category',
                page: 1,
                results: self.bookmarks[name].map(function (movie) {
                    return new Lampa.Card(movie, {
                        is_bookmark: true
                    });
                })
            });
        };

        // Додавання або видалення фільма з закладки
        this.toggleBookmark = function (movie, card) {
            var items = [];
            for (var name in self.bookmarks) {
                items.push({
                    title: name,
                    name: name,
                    selected: self.bookmarks[name].some(function (m) {
                        return m.id === movie.id;
                    })
                });
            }

            Lampa.Select.show({
                title: 'Додати до закладки',
                items: items,
                onSelect: function (a) {
                    var index = self.bookmarks[a.name].findIndex(function (m) {
                        return m.id === movie.id;
                    });

                    if (index > -1) {
                        self.bookmarks[a.name].splice(index, 1);
                        Lampa.Noty.show('Видалено з "' + a.name + '"');
                    } else {
                        self.bookmarks[a.name].push(movie);
                        Lampa.Noty.show('Додано до "' + a.name + '"');
                    }
                    self.saveBookmarks();
                    card.render(); // Оновлюємо картку
                    Lampa.Select.close();
                },
                onBack: function () {
                    Lampa.Select.close();
                }
            });
        };
    }

    var custom_bookmarks_plugin = new CustomBookmarksPlugin();
    Lampa.Plugin.add('custom_bookmarks', custom_bookmarks_plugin);

    // Додаємо стилі для значка закладки
    var style = document.createElement('style');
    style.innerHTML = `
        .card-bookmark-badge {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background-color: rgba(255, 165, 0, 0.8);
            color: white;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);

    // Розширюємо функціонал Lampa для відображення значка та кнопки
    Lampa.Activity.render().forEach(function (js) {
        var a = js.activity;
        var o_render = a.render;
        var o_append = a.append;

        a.render = function () {
            var $this = this;
            var R = o_render.apply(this, arguments);
            R.find('.card').each(function () {
                var card = $(this).data('card');
                if (card) {
                    for (var name in custom_bookmarks_plugin.bookmarks) {
                        if (custom_bookmarks_plugin.bookmarks[name].some(function (m) {
                                return m.id === card.movie.id;
                            })) {
                            var badge = '<div class="card-bookmark-badge">' + name + '</div>';
                            card.display.find('.card__view').append(badge);
                        }
                    }
                }
            });
            return R;
        };
        // Додаємо кнопку до меню картки
        var add_button_to_card = function(object){
                object.activity.onRender = function(complite){
                    var btn = $('<div class="full-start__button selector"><svg height="2em" width="2em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2H8C4.691 2 2 4.691 2 8v12a2 2 0 0 0 2 2h12c3.309 0 6-2.691 6-6V8c0-3.309-2.691-6-6-6zm4 14c0 2.206-1.794 4-4 4H4V8c0-2.206 1.794-4 4-4h8c2.206 0 4 1.794 4 4v8z" fill="currentColor"/><path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6s6-2.691 6-6s-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4s4 1.794 4 4s-1.794 4-4 4z" fill="currentColor"/></svg><span>Закладки</span></div>');

                btn.on('click', function () {
                    custom_bookmarks_plugin.toggleBookmark(object.movie, object);
                });

                complite.find('.full-start__buttons').append(btn);
            }
        }

        if(a.component == 'full'){
            add_button_to_card(a)
        }
    });

})();
