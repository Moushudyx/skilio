import chalk from 'chalk';

const { bgBlue, bgGreen, bgRed, bgYellow, white, blue } = chalk;
/** Print info */
export const info = (...str: any[]) => console.log(`${bgBlue(white(' INFO '))}`, ...str);
/** Print tips */
export const subInfo = (...str: any[]) => console.log(`${blue(' TIP ')}`, ...str);
/** Print warning */
export const warn = (...str: any[]) => console.warn(`${bgYellow(white(' WARN '))}`, ...str);
/** Print success */
export const success = (...str: any[]) => console.log(`${bgGreen(white(' SUCCEED '))}`, ...str);
/** Print error */
export const error = (...str: any[]) => console.error(`${bgRed(white(' ERROR '))}`, ...str);
