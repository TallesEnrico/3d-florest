deploy:
	bun run build
	scp -r ./dist/.				 		root@164.92.120.151:/var/www/lp-ket/3d-florest