(function () {
    'use strict';

    function ViewedContentMarker() {
        // Зберігаємо посилання на екземпляр плагіна
        var self = this;

        // Масив для зберігання ID переглянутого контенту
        var viewed_content = [];

        /**
         * Ініціалізація плагіна
         */
        this.create = function () {
            // Завантажуємо збережені дані при старті
            this.loadData();

            // Слідкуємо за подіями Lampa
            Lampa.Listener.follow('full', function (e) {
                // Якщо подія пов'язана з переглядом відео
                if (e.type == 'video' && e.object) {
                    // Перевіряємо, чи достатньо переглянуто (90%)
                    if (e.object.percent > 90) {
                        self.add(e.data.movie);
                    }
                }
            });
        };

        /**
         * Завантаження даних з локального сховища
         */
        this.loadData = function () {
            viewed_content = Lampa.Storage.get('viewed_content_marker', []);
        };

        /**
         * Збереження даних в локальне сховище
         */
        this.saveData = function () {
            Lampa.Storage.set('viewed_content_marker', viewed_content);
        };

        /**
         * Додавання фільма до списку переглянутих
         * @param {Object} movie - об'єкт фільма
         */
        this.add = function (movie) {
            // Перевіряємо, чи фільм вже є в списку
            if (viewed_content.indexOf(movie.id) == -1) {
                viewed_content.push(movie.id);
                this.saveData();
                // Оновлюємо інтерфейс, щоб показати зміни
                Lampa.Controller.reset();
            }
        };

        /**
         * Візуалізація статусу на постері
         * @param {Object} card - об'єкт картки
         */
        this.renderStatus = function (card) {
            if (viewed_content.indexOf(card.movie.id) > -1) {
                // Додаємо іконку або текст на постер
                var status_badge = '<div class="card-watched-badge">✔</div>';
                card.display.find('.card__view').append(status_badge);
            }
        };
    }

    // Створюємо екземпляр плагіна
    var viewed_plugin = new ViewedContentMarker();

    // Реєструємо плагін в Lampa
    Lampa.Plugin.add('viewed_content_marker', viewed_plugin);

    // Додаємо стилі для нашого значка
    var style = document.createElement('style');
    style.innerHTML = `
        .card-watched-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 255, 0, 0.7);
            color: white;
            padding: 5px 8px;
            border-radius: 50%;
            font-size: 16px;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    // Розширюємо функціонал Lampa для відображення статусу
    Lampa.Activity.render().forEach(function (js) {
        var a = js.activity;
        var o = a.render;

        a.render = function () {
            var $this = this;
            var R = o.apply(this, arguments);

            R.find('.card').each(function () {
                var card = $(this).data('card');
                if (card) {
                    viewed_plugin.renderStatus(card);
                }
            });

            return R;
        };
    });

})();
