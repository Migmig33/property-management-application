var app = angular.module('app', ['chart.js']);

app.config(function ($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
});