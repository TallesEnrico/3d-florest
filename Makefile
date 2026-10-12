deploy:
	yarn build
	scp -r ./dist/.				 		root@164.92.120.151:/var/www/lp-ket