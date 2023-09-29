git pull
git config --global user.email "$MAIL"
git config --global user.name "Actions"
git add resourcepacks.json
git add leaderboards/dailylist.json
git add leaderboards/weeklylist.json
git commit --allow-empty -m "[auto update]"
git push https://toarch7:${API_TOKEN_GITHUB}@github.com/toarch7/ntm-browser
