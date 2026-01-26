export const formatDate = (date: Date, format: string): string => {
  const pad = (n: number, width: number = 2) => String(n).padStart(width, '0');

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    SSS: pad(date.getMilliseconds(), 3),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => replacements[match]);
};

export interface TemplateContext {
  hostname: string;
  timestamp: Date;
  collectionHost?: string;
  fileName?: string;
}

export const processTemplate = (template: string, context: TemplateContext): string => {
  return template.replace(/\$\{(.*?)\}/g, (_, content) => {
    const parts = content.split(':');
    const key = parts[0].trim();
    const format = parts.slice(1).join(':').trim(); // Handle format containing colons if we want, though our simple format doesn't use them as tokens.

    switch (key) {
      case 'host':
      case 'hostname':
        return context.hostname;
      case 'collectionHost':
        return context.collectionHost || '';
      case 'fileName':
        return context.fileName || '';
      case 'timestamp':
        if (format) {
          return formatDate(context.timestamp, format);
        }
        // Default format if none specified: YYYYMMDDHHmmss
        // This is safe for filenames.
        return formatDate(context.timestamp, 'YYYYMMDDHHmmss');
      default:
        // Return original string if variable not recognized
        return `\${${content}}`;
    }
  });
};
