var pubsub;
(function (pubsub) {
    var registry = {};
    function Pub(name, obj) {
        if (!registry[name]) {
            return;
        }
        let subs = registry[name];
        subs.forEach(sub => {
            sub(obj);
        });
    }
    pubsub.Pub = Pub;
    function Sub(name, sub) {
        let subs = registry[name];
        if (!subs) {
            registry[name] = [sub];
        }
        else {
            subs.push(sub);
        }
    }
    pubsub.Sub = Sub;
})(pubsub || (pubsub = {}));
