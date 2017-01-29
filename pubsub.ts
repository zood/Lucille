namespace pubsub {

    export interface Subscription {
        (obj: any | null): void;
    }

    interface Registry {
        [name: string]: Subscription[];
    }

    var registry: Registry = {};

    export function Pub(name: string, obj: any | null) {
        if (!registry[name]) {
            return;
        }

        let subs = registry[name];
        subs.forEach(sub => {
            sub(obj);
        });
    }

    export function Sub(name: string, sub: Subscription) {
        let subs = registry[name];
        if (!subs) {
            registry[name] = [sub];
        } else {
            subs.push(sub);
        }
    }
}