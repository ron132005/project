const axios = require('axios');
const fs = require('fs');

const capitalizeFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const fetchPokemonData = async (searchQuery) => {
  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(searchQuery.toLowerCase())}/`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error('Pokemon not found');
  }
};

const fetchAbility = async (abilityUrl) => {
  try {
    const response = await axios.get(abilityUrl);
    return response.data.effect_entries.find(entry => entry.language.name === 'en').effect;
  } catch (error) {
    return 'Ability information not available';
  }
};

const handlePokemonCommand = async (api, event) => {
  const searchQuery = event.body.replace('•pokemon', '').trim();

  if (!searchQuery) {
    api.sendMessage('🔃 Please enter a valid Pokemon name or ID to search.', event.threadID, event.messageID);
    return;
  }

  try {
    const pokemonData = await fetchPokemonData(searchQuery);
    if (pokemonData) {
      const abilities = await Promise.all(pokemonData.abilities.map(async (ability, index) => {
        const abilityName = capitalizeFirstLetter(ability.ability.name.replace(/-/g, ' '));
        const abilityData = await fetchAbility(ability.ability.url);
        return `${index + 1}. ${abilityName}: ${abilityData}`;
      }));
      const formattedAbilities = abilities.join('\n\n');

      const types = pokemonData.types.map((type) => capitalizeFirstLetter(type.type.name)).join(', ');

      const fetchDamageRelations = async (url) => {
        const response = await axios.get(url);
        const damageRelations = response.data.damage_relations;
        const weaknesses = [...new Set(damageRelations.double_damage_from.map((type) => capitalizeFirstLetter(type.name)))];
        const strengths = [...new Set(damageRelations.double_damage_to.map((type) => capitalizeFirstLetter(type.name)))];
        return { weaknesses, strengths };
      };

      const damageRelationsUrls = pokemonData.types.map((type) => type.type.url);
      const damageData = await Promise.all(damageRelationsUrls.map(fetchDamageRelations));

      const allWeaknesses = [...new Set(damageData.flatMap((data) => data.weaknesses))].join(', ');
      const allStrengths = [...new Set(damageData.flatMap((data) => data.strengths))].join(', ');

      const message = `
        𝗡𝗮𝗺𝗲: ${capitalizeFirstLetter(pokemonData.name)}\n𝗧𝘆𝗽𝗲: ${types}\n\n𝗛𝗲𝗶𝗴𝗵𝘁: ${pokemonData.height / 10} m\n𝗪𝗲𝗶𝗴𝗵𝘁: ${pokemonData.weight / 10} kg\n\n𝗔𝗯𝗶𝗹𝗶𝘁𝗶𝗲𝘀:\n${formattedAbilities}\n\n𝗦𝘁𝗿𝗲𝗻𝗴𝘁𝗵𝘀: ${allStrengths}\n𝗪𝗲𝗮𝗸𝗻𝗲𝘀𝘀𝗲𝘀: ${allWeaknesses}`;

      try {
        const thumbnailImageUrl = pokemonData.sprites.front_default;
        const imageBuffer = await axios.get(thumbnailImageUrl, { responseType: 'arraybuffer' });
        const imageName = 'pokemon_thumbnail.png';
        fs.writeFileSync(imageName, imageBuffer.data);

        const messageWithAttachment = {
          body: message,
          attachment: fs.createReadStream(imageName)
        };

        api.sendMessage(messageWithAttachment, event.threadID, () => {
          fs.unlinkSync(imageName);
        });
      } catch (error) {
        console.error('Error sending image:', error);
      }
    }
  } catch (error) {
    api.sendMessage('Pokemon not found.', event.threadID, event.messageID);
    console.error('Pokemon not found:', error);
  }
};

const handleEvent = async (api, event) => {
  const message = event.body.trim().toLowerCase();
  if (message.startsWith('•pokemon')) {
    await handlePokemonCommand(api, event);
  }
};

module.exports = handleEvent;
