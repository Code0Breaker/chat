import { FormatUtils } from './format.utils';

/**
 * @deprecated Use FormatUtils.timeAgo instead
 */
export const timeAgo = (dateString: string): string => {
    return FormatUtils.timeAgo(dateString);
};