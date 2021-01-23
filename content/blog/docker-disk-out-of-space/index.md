---
title: Docker in production -- running out of disk space
date: '2021-01-23T00:00:00.000Z'
description:
  How to solve your production container running out of space with docker
---

**tl;dr: If you are deploying docker containers to production, be sure to run
`docker system prune -f` before pulling new images.**

When I'm building a new project, I generally learn towards using
[docker compose](https://docs.docker.com/compose/) during development. When
coupled with [docker machine](https://docs.docker.com/machine/) I have a quick
and easy way to deploy my containers to the cloud provider of my choice.
Overall, it works really well, but there's one important thing to consider when
using docker for development and production: running out of disk space.

Images, containers, networks, and volumes will continue to grow on a production
VM which will inevitably lead to the hard drive running out of memory. This
seems obvious, but it wasn't obvious to me when I first started using
`docker-machine`.

I recently deployed a new app [listifi](https://listifi.app) to
[google cloud compute](https://cloud.google.com/). Here's a brief overview of my
deployment process:

- Develop using `docker-compose` locally
- Build features locally
- Use a production tuned `docker-compose` yml file to build images locally
- Push the images to Google's Container Registry
- Then I run `eval $(docker-machine <name> env)` to tunnel into my production
  VM's docker
- Then I run `docker-compose -f production.yml pull --ignore-pull-failures` to
  download the new images
- Then I run `docker-compose -f production.yml up --no-deps -d` to restart my
  containers with the new images

This process works great. I don't need to setup CI for a new project but it
still provides me with the flexability to deploy to my own VM and inspect its
health with docker.

# The problem

Things are working great, I'm iterating on feature development and deploying in
between major changes. Only, the last deploy I tried to perform failed. The
reason: hard drive is out of space. Hmm, my VM has 16GB of diskspace, why is it
out of memory? I can see my containers only total maybe 1GB.

When I run `docker system df` the problem becomes clear: I have unused images
soaking up all of my hard drive space. I have scoured docker deployment
strategies and never came across documentation that references this issue. There
are plenty of StackOverflow issues referencing the problem with a solution, but
I never really made the connection to my production VM until I hit this problem.

# The solution

Before I pull my new images in production, I run another command:

```bash
docker system prune -f
```

You can read the documentation on this
[command here](https://docs.docker.com/engine/reference/commandline/system_prune/).
Once I added that to my deployment step, things are working much more smoothly.

# Conclusion

This seems really obvious: when docker caches the different layers of images, it
leaves behind those layers to be reused. However, when we make changes to the
app, those layers end up never getting reused and then lay around taking up
harddrive space.

It never clicked for me until I ran into the problem, hopefully this short blog
article will help others avoid this problem in the future as well.
