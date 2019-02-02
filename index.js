const data = require("./data");
const dovahzulWords = data.dovahzul;
const englishWords = data.english;
const directTranslations = data.direct;
const punctuationMarks = data.punctuation;
const conversions = data.conversions;

const isPlural = (word, language) => {
  if (language === "english") return word.endsWith("s") || word.endsWith("es");
  if (language === "dovahzul")
    return word.endsWith(word.charAt(word.length - 3) + "e");
};

const isSingular = (word, language) => {
  return !isPlural(word, language);
};

const getPlural = (word, language) => {
  if (language === "english") return word + "s";
  if (language === "dovahzul") return word + word.charAt(word.length - 1) + "e";
};

const getSingular = (word, language) => {
  if (language === "english") return word.slice(0, word.length - 1);
  if (language === "dovahzul") return word.slice(0, word.length - 2);
};

const getConversions = (word, convType, prevWord, conversionTypes) => {
  if(!word) return [];
  if (conversionTypes.convType) {
    for (let conv of conversionTypes.convType) {
      const baseConvs = [conv.casual, conv.formal];
      let convs = baseConvs;
      if (conv.if) {
        if (conv.if.before) {
          convs = [];
          for (let bef of conv.if.before) {
            if (word.startsWith(bef)) {
              convs.push(...baseConvs.filter(c => c.startsWith("<")));
              break;
            } else if (prevWord === bef) {
              convs.push(...baseConvs.filter(c => !c.startsWith("<")));
              break;
            }
          }
        }
      }
      for (const type of convs) {
        if (word === type) {
          return [conv[convType]];
        } else if (type.charAt(0) === "<" && word.endsWith(type.slice(1))) {
          const base = word.slice(0, -type.slice(1));
          if (conv[convType].startsWith("<")) {
            return base + conv[convType];
          } else {
            return [word.slice(0, -type.slice(1).length), conv[convType]];
          }
        }
      }
    }
  }
  return [];
};

process.stdin.on("data", d => {
  const input = d.toString().trim();
  let language = "???";
  let translations = {};
  switch (input.charAt(0)) {
    case "e":
      language = "english";
      translations = englishWords;
      break;
    case "d":
      language = "dovahzul";
      translations = dovahzulWords;
      break;
  }
  let convType = "???";
  switch (input.charAt(1)) {
    case " ":
    case "c":
      convType = "casual";
      break;
    case "f":
      convType = "formal";
  }
  if (input.charAt(2) !== "<") {
    console.log("invalid input");
    return;
  }
  const otherLanguage =
    language === "english"
      ? "dovahzul"
      : language === "dovahzul"
      ? "english"
      : "???";
  for (const word in translations) {
    if (typeof translations[word] === "string") {
      translations[word] = { direct: translations[word] };
    }
  }
  for (const translation of directTranslations) {
    translations[translation[language]] = {
      direct: translation[otherLanguage],
      plural: translation.plural || false
    };
  }
  const words = input
    .slice(3)
    .trim()
    .split(" ");
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const char = word.charAt(j);
      if (punctuationMarks.includes(char)) {
        const halves = word.split(char, 2);
        words.splice(i, 1, halves[0], char, halves[1]);
        i++;
        break;
      }
    }
  }
  const result = [];
  for (let i = 0; i < words.length; i++) {
    const wordIn = words[i];
    let next = false;
    if (wordIn === "") {
      result.push(" ");
      next = true;
    }
    for (let mark of punctuationMarks) {
      if (wordIn.startsWith(mark)) {
        result[result.length - 1] = result[result.length - 1] + mark;
        next = true;
        break;
      }
    }
    if (next) continue;
    let finalWordIn = wordIn;
    if (conversions[language]) {
      const conversionTypes = conversions[language];
      const conv = getConversions(
        wordIn,
        "formal",
        result[result.length - 1],
        conversionTypes
      );
      if (conv[0]) finalWordIn = conv[0];
      if (conv[1]) words.splice(i + 1, 0, conv[1]);
    }
    let finalWordOut = null;
    const translation = translations[finalWordIn];
    if (!translation) {
      if (isPlural(finalWordIn, language)) {
        const newTranslation = translations[getSingular(finalWordIn, language)];
        if (newTranslation && newTranslation.plural)
          finalWordOut = getPlural(newTranslation.direct, otherLanguage);
      }
    } else {
      finalWordOut = translation.direct;
      if (!finalWordOut && translation.before) {
        const before = translation.before;
        const w = result[result.length - 1];
        if (w) {
          for (let key in before.cases) {
            if (w === key) {
              finalWordOut = before.cases[key];
              break;
            }
          }
          if (!finalWordOut) {
            if (before.singular && isSingular(w, otherLanguage)) {
              finalWordOut = before.singular;
            }
            if (before.plural && isPlural(w, otherLanguage)) {
              finalWordOut = before.plural;
            }
          }
        } else {
          finalWordOut = `<${before.unknown}>`;
        }
      }
      if (!finalWordOut && translation.convType) {
        finalWordOut = translation.convType[convType] || null;
      }
    }
    let skip = false;
    if (conversions[otherLanguage]) {
      const conversionTypes = conversions[otherLanguage];
      const conv = getConversions(
        finalWordOut,
        convType,
        result[result.length - 1],
        conversionTypes
      );
      if (conv[0]) {
        if (conv[0].charAt(0) === "<") {
          result[result.length - 1] += conv[0].slice(1);
          skip = true;
        } else {
          finalWordOut = conv.join(" ");
        }
      }
    }
    if (!skip) result.push(finalWordOut);
  }
  console.log(
    otherLanguage.charAt(0) +
      convType.charAt(0) +
      "> " +
      result.map(w => (w ? w : "???")).join(" ")
  );
});
