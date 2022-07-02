const ua = navigator.userAgent
export const isWindows = /win(dows|32|64)/i.test(ua)
export const isMac = /mac os/i.test(ua)
export const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
