document.addEventListener("DOMContentLoaded", () => {
  const carouselContainer = document.getElementById("carousel-container");
  const insightBox = document.getElementById("healing-insight-box");

  const modal = document.getElementById("video-modal");
  const videoFrame = document.getElementById("video-frame");
  const voiceTags = document.getElementById("voice-tags");
  const closeModal = document.getElementById("close-modal");

  fetch('final_db_clustered_tagged_cleaned.json')
    .then(res => res.json())
    .then(data => {
      data.forEach(item => {
        item.hope_driven_quotes.forEach(quote => {
          const div = document.createElement("div");
          div.className = "carousel-item";
          div.innerHTML = `
            <img src="${item.thumbnail_url}" alt="${quote}">
            <p>${quote}</p>
          `;
          div.onclick = () => {
            videoFrame.src = item.url.replace("watch?v=", "embed/");
            voiceTags.innerHTML = item.voice_tags.map(tag => `<span>${tag}</span>`).join(" ");
            modal.classList.remove("hidden");
          };
          carouselContainer.appendChild(div);
        });
      });
    });

  fetch('facts.json')
    .then(res => res.json())
    .then(data => {
      const insights = data.healing_insights;
      let index = 0;

      const updateInsight = () => {
        const insight = insights[index % insights.length];
        insightBox.innerHTML = `
          <h3>${insight.title}</h3>
          <p><strong>Category:</strong> ${insight.category}</p>
          <p><strong>Stat:</strong> ${insight.stat}</p>
          <blockquote>"${insight.quote}"</blockquote>
          <p><strong>Action:</strong> ${insight.action}</p>
          <p><strong>Hope Factor:</strong> ${insight.hope_factor}</p>
        `;
        index++;
      };

      updateInsight();
      setInterval(updateInsight, 900000); // 15 minutes
    });

  closeModal.onclick = () => {
    modal.classList.add("hidden");
    videoFrame.src = "";
  };
function openVideo(src) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("videoPlayer");

  video.src = src;
  modal.classList.remove("hidden");
}

function closeVideo() {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("videoPlayer");

  modal.classList.add("hidden");
  video.pause();
  video.src = ""; // Unload video
}


  
});
