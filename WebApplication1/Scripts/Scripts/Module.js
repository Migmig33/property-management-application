var app = angular.module('app', ['chart.js']);

app.config(function ($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
});
app.run(['$http', '$interval', function ($http, $interval) {

    var antiForgeryInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (antiForgeryInput && antiForgeryInput.value) {
        $http.defaults.headers.post.RequestVerificationToken = antiForgeryInput.value;
    }

    function heartbeat() {
        $http.get('/Auth/CheckActiveUser').catch(function () {
            
        });
    }

    heartbeat();                    // stamp immediately on load
    $interval(heartbeat, 120000);   // then every 2 minutes
}]);
