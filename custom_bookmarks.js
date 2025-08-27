(function () {
    'use strict';

    function ViewedContentMarker() {
        var self = this;
        var viewed_content = [];

        this.create = function () {
            this.loadData();
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'video' && e.object) {
                    if (e.object.percent > 90) {
                        self.add(e.data.movie);
                    }
                }
            });
        };

        this.loadData = function () {
            viewed_content = Lampa.Storage.get('viewed_content_marker', []);
        };

        this.saveData = function () {
            Lampa.Storage.set('viewed_content_marker', viewed_content);
        };

        this.add = function (movie) {
            if (viewed_content.indexOf(movie.id) == -1) {
                viewed_content.push(movie.id);
                this.saveData();
                Lampa.Controller.reset();
            }
        };

        this.renderStatus = function (card) {
            if (viewed_content.indexOf(card.movie.id) > -1) {
                var status_badge = '<div class="card-watched-badge">✔</div>';
                card.display.find('.card__view').append(status_badge);
            }
        };
    }

    var viewed_plugin = new ViewedContentMarker();
    Lampa.Plugin.add('viewed_content_marker', viewed_plugin);

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
            z-index: 2;
        }
    `;
    document.head.appendChild(style);

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
