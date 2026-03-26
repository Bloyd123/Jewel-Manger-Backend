import EventEmitter from 'events';

const eventBus = new EventEmitter();

// Max listeners badhao — multiple listeners honge ek event pe
eventBus.setMaxListeners(20);

export default eventBus;