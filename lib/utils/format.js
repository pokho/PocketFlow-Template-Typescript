/**
 *
 * @param {string[]} templates
 * @returns {Array<{name: string, value: string}>}
 */
export const formatAvailableTemplates = (templates) => {
    return templates.map((value) => {
        const name = capitalize(value);
        return {
            name,
            value,
        };
    });
};

const capitalize = (str) => {
    return str[0].toUpperCase() + str.slice(1);
};
