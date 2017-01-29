var pubsub;
(function (pubsub) {
    var registry = {};
    function Pub(name, obj) {
        if (!registry[name]) {
            return;
        }
        var subs = registry[name];
        subs.forEach(function (sub) {
            sub(obj);
        });
    }
    pubsub.Pub = Pub;
    function Sub(name, sub) {
        var subs = registry[name];
        if (!subs) {
            registry[name] = [sub];
        }
        else {
            subs.push(sub);
        }
    }
    pubsub.Sub = Sub;
})(pubsub || (pubsub = {}));
